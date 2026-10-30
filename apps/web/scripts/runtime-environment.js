/** @param {string} value */
function parseAppUrl(value) {
	const invalid = () => new Error('Invalid url.app: expected an HTTP(S) URL without credentials')
	const authority = value.match(/^https?:\/\/([^/\\?#\s]+)/i)?.[1]
	if (!authority || /[\\\s\p{Cc}]/u.test(value)) throw invalid()

	let url
	try {
		url = new URL(value)
	} catch {
		throw invalid()
	}
	if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw invalid()
	if (url.username || url.password || authority.includes('@')) throw invalid()
	return url
}

/** @param {string} app */
function originFromAppUrl(app) {
	const schemeCandidate = app.replace(/[\s\p{Cc}]/gu, '')
	if (!/^[a-z][a-z\d+.-]*:/i.test(schemeCandidate)) return undefined
	return parseAppUrl(app).origin
}

/** @param {string} app */
export function resolveAuthUrl(app) {
	const origin = originFromAppUrl(app)
	if (origin) return origin
	throw new Error('Authentication requires an absolute url.app')
}

/**
 * @param {Pick<import('@luzzle/web.templates/config').TemplateConfig, 'network' | 'url' | 'auth'>} config
 * @param {NodeJS.ProcessEnv} environment
 * @returns {NodeJS.ProcessEnv}
 */
export function createServerEnvironment(config, environment = process.env) {
	/** @type {NodeJS.ProcessEnv} */
	const env = { ...environment, HOST: config.network?.public?.host || '0.0.0.0' }
	const origin = originFromAppUrl(config.url.app)
	if (config.auth && !origin) throw new Error('Authentication requires an absolute url.app')

	if (origin) env.ORIGIN = origin
	else delete env.ORIGIN
	return env
}
