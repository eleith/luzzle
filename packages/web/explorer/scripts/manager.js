import { loadConfig, triggerBuilder } from '@luzzle/web.utils/server'
import { spawn } from 'node:child_process'
import { access, constants, mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PATHS = {
	CONFIG: '/app/config.yaml',
	ASSETS_BUILD: '/app/assets/build',
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

class HookManager {
	static async trigger(hookConfig, name) {
		try {
			const response = await triggerBuilder(hookConfig, name)

			if (response.ok) {
				await Logger.log(`Successfully triggered ${name} hook`)

				const reader = response.body?.getReader()
				if (reader) {
					const decoder = new TextDecoder()
					while (true) {
						const { done, value } = await reader.read()
						if (done) break
						const chunk = decoder.decode(value, { stream: true })
						const lines = chunk.split('\n').filter((l) => l.trim())
						for (const line of lines) {
							await Logger.log(`[${name}] ${line}`)
						}
					}
				}
			} else {
				await Logger.log(`Warning: ${name} hook failed (${response.status})`)
			}
		} catch (error) {
			await Logger.log(`Error triggering ${name} hook: ${error.message}`)
		}
	}
}

class BuildManager {
	static async hasCache() {
		try {
			await access(PATHS.ASSETS_BUILD, constants.R_OK)
			const files = await readdir(PATHS.ASSETS_BUILD)
			return files.length > 0
		} catch {
			return false
		}
	}

	static async run() {
		await Logger.log('Starting SvelteKit build...')
		await CommandRunner.run('npm', ['run', 'build'])
		await Logger.log('Build completed successfully.')
	}

	static async restoreFromCache() {
		await Logger.log('Restoring build from cache...')
		await CommandRunner.run('rsync', [
			'-rl',
			'--delete',
			`${PATHS.ASSETS_BUILD}/`,
			`${PATHS.LOCAL_BUILD}`
		])
		await Logger.log('Restore completed.')
	}

	static async saveToCache() {
		await Logger.log('Saving build to cache...')
		await mkdir(PATHS.ASSETS_BUILD, { recursive: true }).catch(() => {})
		await CommandRunner.run('rsync', [
			'-rl',
			'--delete',
			`${PATHS.LOCAL_BUILD}/`,
			`${PATHS.ASSETS_BUILD}`
		])
		await Logger.log('Cache saved.')
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
			if (await BuildManager.hasCache()) {
				await Logger.log('Cache found. Skipping build.')
				await BuildManager.restoreFromCache()
			} else {
				await Logger.log('No cache found. Initiating build sequence...')
				await BuildManager.run()
				await BuildManager.saveToCache()

				if (this.config.builder?.url) {
					await HookManager.trigger(this.config.builder, 'deploy')
					await HookManager.trigger(this.config.builder, 'build')
				}
			}
		}

		const serverPromise = this.startServer()

		if (this.isDev && this.config.builder?.url) {
			await HookManager.trigger(this.config.builder, 'deploy')
			await HookManager.trigger(this.config.builder, 'build')
		}

		await serverPromise
	}

	async startServer() {
		await Logger.log('Starting Luzzle Web Explorer ...')

		const spawnOptions = {
			stdio: 'inherit',
			shell: this.isDev
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
