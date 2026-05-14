import { loadConfig } from '@luzzle/web.config'
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const PATHS = {
	CONFIG: '/app/config.yaml',
	LOCAL_BUILD: '/app/build',
	LOG: '/app/data/build.log'
}

const isDev = process.env.LUZZLE_DEV === 'true'

class Logger {
	static async log(message) {
		const timestamp = new Date().toISOString()
		const formattedMessage = `[${timestamp}] ${message}`
		console.log(message)

		if (!isDev) {
			await writeFile(PATHS.LOG, formattedMessage + '\n', { flag: 'a' })
		}
	}

	static async clear() {
		if (!isDev) {
			await writeFile(PATHS.LOG, '')
		}
	}
}

class CommandRunner {
	static run(command, args, options = {}) {
		return new Promise((resolve, reject) => {
			const child = spawn(command, args, {
				stdio: 'inherit',
				shell: true,
				...options
			})

			child.on('close', (code) => {
				if (code === 0) resolve()
				else reject(new Error(`Command "${command} ${args.join(' ')}" failed with code ${code}`))
			})

			child.on('error', reject)
		})
	}
}

class ExplorerManager {
	constructor() {
		this.config = null
		this.serverProcess = null
		this.isDev = isDev
	}

	async initialize() {
		await Logger.clear()
		this.config = loadConfig(PATHS.CONFIG)
		await Logger.log(`Config App URL: ${this.config.url.app}`)
	}

	async run() {
		await this.initialize()

		if (this.isDev) {
			await Logger.log('Running in development mode...')
		} else {
			await Logger.log('Initiating production build sequence...')
			await CommandRunner.run('npm', ['run', 'build'])
			await Logger.log('Build completed successfully.')
		}

		await this.startServer()
	}

	async startServer() {
		await Logger.log('Starting Luzzle Web Explorer ...')

		const env = { ...process.env }
		env.HOST = this.config?.network?.public?.host || '0.0.0.0'

		const spawnOptions = {
			stdio: 'inherit',
			shell: this.isDev,
			env
		}

		const command = this.isDev ? 'npm' : 'node'
		const args = this.isDev
			? ['run', 'dev', '--', '--host']
			: [path.join(PATHS.LOCAL_BUILD, 'index.js')]

		this.serverProcess = spawn(command, args, spawnOptions)

		this.setupSignalHandlers()

		return new Promise((resolve, reject) => {
			this.serverProcess.on('close', (code) => {
				Logger.log(`Server process exited with code ${code}`)
				if (code === 0 || code === null) resolve()
				else reject(new Error(`Server exited with code ${code}`))
				process.exit(code || 0)
			})

			this.serverProcess.on('error', (err) => {
				Logger.log(`Failed to start server: ${err.message}`)
				reject(err)
				process.exit(1)
			})
		})
	}

	setupSignalHandlers() {
		const shutdown = (signal) => {
			if (this.serverProcess) {
				Logger.log(`Received ${signal}, shutting down server...`)
				this.serverProcess.kill(signal)
			}
		}

		process.on('SIGTERM', () => shutdown('SIGTERM'))
		process.on('SIGINT', () => shutdown('SIGINT'))
	}
}

new ExplorerManager().run().catch(async (error) => {
	await Logger.log(`FATAL ERROR: ${error.message}`)
	process.exit(1)
})
