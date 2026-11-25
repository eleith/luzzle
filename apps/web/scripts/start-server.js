import { loadConfig } from '@luzzle/web.templates/config'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
	createServerEnvironment,
	installRequestOrigin,
	resolveAppOrigin
} from './runtime-environment.js'

/** @param {NodeJS.ProcessEnv} environment */
function applyServerEnvironment(environment) {
	for (const key of ['HOST', 'ORIGIN', 'PROTOCOL_HEADER', 'HOST_HEADER', 'PORT_HEADER']) {
		const value = environment[key]
		if (value === undefined) delete process.env[key]
		else process.env[key] = value
	}
}

/** @param {string} entry */
export async function startServer(entry = path.resolve('build/index.js')) {
	const config = loadConfig(path.resolve('config.yaml'))
	const origin = resolveAppOrigin(config.url.app)
	applyServerEnvironment(createServerEnvironment(config))
	const { server } = await import(pathToFileURL(entry).href)
	installRequestOrigin(server, origin)
	return server
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
	await startServer()
}
