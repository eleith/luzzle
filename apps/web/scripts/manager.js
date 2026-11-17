import { loadConfig } from '@luzzle/web.templates/config'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import path from 'node:path'
import { createDevServerEnvironment } from './runtime-environment.js'

try {
	const config = loadConfig(path.resolve('config.yaml'))
	const env = createDevServerEnvironment(config)
	console.log('Starting Luzzle development server…')
	const server = spawn('pnpm', ['run', 'dev', '--', '--host'], {
		stdio: 'inherit',
		env
	})

	process.on('SIGTERM', () => server.kill('SIGTERM'))
	process.on('SIGINT', () => server.kill('SIGINT'))

	const [code] = await once(server, 'close')
	process.exitCode = code ?? 0
} catch (error) {
	console.error(`Development startup failed: ${error.message}`)
	process.exitCode = 1
}
