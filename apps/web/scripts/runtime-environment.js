const protocolHeader = 'x-luzzle-public-protocol'
const authorityHeader = 'x-luzzle-public-authority'

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
export function resolveAppOrigin(app) {
	const schemeCandidate = app.replace(/[\s\p{Cc}]/gu, '')
	if (!/^[a-z][a-z\d+.-]*:/i.test(schemeCandidate)) return undefined
	return parseAppUrl(app).origin
}

/** @param {string} app */
export function resolveAuthUrl(app) {
	const origin = resolveAppOrigin(app)
	if (origin) return origin
	throw new Error('Authentication requires an absolute url.app')
}

/**
 * @param {import('node:http').Server} server
 * @param {string | undefined} origin
 */
export function installRequestOrigin(server, origin) {
	if (!origin) return
	const url = new URL(origin)
	const protocol = url.protocol.slice(0, -1)
	server.prependListener('request', (request) => {
		request.headers[protocolHeader] = protocol
		request.headers[authorityHeader] = url.host
	})
}

/**
 * @param {Pick<import('@luzzle/web.templates/config').TemplateConfig, 'network' | 'url' | 'auth'>} config
 * @param {NodeJS.ProcessEnv} environment
 * @returns {NodeJS.ProcessEnv}
 */
export function createServerEnvironment(config, environment = process.env) {
	/** @type {NodeJS.ProcessEnv} */
	const env = { ...environment, HOST: config.network?.public?.host || '0.0.0.0' }
	const origin = resolveAppOrigin(config.url.app)
	if (config.auth && !origin) throw new Error('Authentication requires an absolute url.app')
	delete env.ORIGIN
	if (origin) {
		env.PROTOCOL_HEADER = protocolHeader
		env.HOST_HEADER = authorityHeader
		env.PORT_HEADER = ''
	}
	return env
}
