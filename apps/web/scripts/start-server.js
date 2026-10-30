import { loadConfig } from '@luzzle/web.templates/config'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServerEnvironment } from './runtime-environment.js'

/** @param {NodeJS.ProcessEnv} environment */
function applyServerEnvironment(environment) {
	for (const key of ['HOST', 'ORIGIN']) {
		const value = environment[key]
		if (value === undefined) delete process.env[key]
		else process.env[key] = value
	}
}

const config = loadConfig(path.resolve('config.yaml'))
const environment = createServerEnvironment(config)
applyServerEnvironment(environment)

await import(pathToFileURL(path.resolve('build/index.js')).href)
