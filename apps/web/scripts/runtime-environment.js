/**
 * @param {string} value
 * @param {'ORIGIN' | 'url.app'} field
 */
function parseHttpUrl(value, field) {
	const invalid = () => new Error(`Invalid ${field}: expected an HTTP(S) URL without credentials`)
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
	return parseHttpUrl(app, 'url.app').origin
}

/** @param {string} origin */
function normalizeExplicitOrigin(origin) {
	if (origin === '') return origin

	const url = parseHttpUrl(origin, 'ORIGIN')
	if (!/^https?:\/\/[^/\\?#\s]+\/?$/i.test(origin)) {
		throw new Error('Invalid ORIGIN: expected an HTTP(S) origin without path, query or fragment')
	}
	return url.origin
}

/**
 * @param {string | undefined} appOrigin
 * @param {string | undefined} explicitOrigin
 */
function resolveOrigin(appOrigin, explicitOrigin) {
	if (explicitOrigin !== undefined) return normalizeExplicitOrigin(explicitOrigin)
	return appOrigin
}

/**
 * @param {import('@luzzle/web.templates/config').TemplateConfig['auth']} auth
 * @param {string | undefined} origin
 * @param {NodeJS.ProcessEnv} environment
 */
function shouldDefaultAuthUrl(auth, origin, environment) {
	return Boolean(
		auth && origin && environment.AUTH_URL === undefined && environment.NEXTAUTH_URL === undefined
	)
}

/**
 * @param {Pick<import('@luzzle/web.templates/config').TemplateConfig, 'network' | 'url' | 'auth'>} config
 * @param {NodeJS.ProcessEnv} environment
 * @returns {NodeJS.ProcessEnv}
 */
export function createServerEnvironment(config, environment = process.env) {
	/** @type {NodeJS.ProcessEnv} */
	const env = { ...environment, HOST: config.network?.public?.host || '0.0.0.0' }
	const appOrigin = originFromAppUrl(config.url.app)
	const origin = resolveOrigin(appOrigin, environment.ORIGIN)

	if (origin !== undefined) env.ORIGIN = origin
	if (shouldDefaultAuthUrl(config.auth, origin, environment)) env.AUTH_URL = origin
	return env
}
