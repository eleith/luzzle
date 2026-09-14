import { spawn } from 'child_process'
import type { Logger } from './logger.js'

export interface RcloneBisyncOptions {
	localPath: string
	remote: string
	remotePath: string
	configPath: string
	workdir: string
	resync?: boolean
	flags?: string[]
}

export interface RcloneSyncOptions {
	localPath: string
	remote: string
	remotePath: string
	configPath: string
	flags?: string[]
}

export interface RcloneCopyOptions {
	localPath: string
	remote: string
	remotePath: string
	configPath: string
	flags?: string[]
}

export interface RcloneCheckOptions {
	remote: string
	remotePath: string
	configPath: string
	timeoutMs?: number
}

export type RcloneCheckResult = { ok: true } | { ok: false; reason: string }

export class RcloneClient {
	private logger: Logger

	constructor(logger: Logger) {
		this.logger = logger
	}

	async bisync(options: RcloneBisyncOptions): Promise<void> {
		const args = [
			'bisync',
			options.localPath,
			`${options.remote}:${options.remotePath}`,
			'--config',
			options.configPath,
			'--workdir',
			options.workdir,
			'--verbose',
		]

		if (options.resync) {
			args.push('--resync')
		} else {
			args.push('--resilient', '--recover', '--max-lock', '2m')
		}

		if (options.flags?.length) {
			args.push(...options.flags)
		}

		this.logger.info('rclone bisync starting', {
			local: options.localPath,
			remote: `${options.remote}:${options.remotePath}`,
			flags: options.flags,
		})

		await this.run('rclone', args)
	}

	async sync(options: RcloneSyncOptions): Promise<void> {
		const args = [
			'sync',
			options.localPath,
			`${options.remote}:${options.remotePath}`,
			'--config',
			options.configPath,
			'--verbose',
		]

		if (options.flags?.length) {
			args.push(...options.flags)
		}

		this.logger.info('rclone sync starting', {
			local: options.localPath,
			remote: `${options.remote}:${options.remotePath}`,
			flags: options.flags,
		})

		await this.run('rclone', args)
	}

	async copy(options: RcloneCopyOptions): Promise<void> {
		const args = [
			'copy',
			options.localPath,
			`${options.remote}:${options.remotePath}`,
			'--config',
			options.configPath,
			'--verbose',
		]

		if (options.flags?.length) {
			args.push(...options.flags)
		}

		this.logger.info('rclone copy starting', {
			local: options.localPath,
			remote: `${options.remote}:${options.remotePath}`,
			flags: options.flags,
		})

		await this.run('rclone', args)
	}

	checkConnectivity(options: RcloneCheckOptions): Promise<RcloneCheckResult> {
		const { remote, remotePath, configPath, timeoutMs = 10000 } = options
		const args = ['lsd', `${remote}:${remotePath}`, '--config', configPath, '--max-depth', '1']

		this.logger.info('rclone connectivity check starting', {
			remote: `${remote}:${remotePath}`,
		})

		return new Promise((resolve) => {
			const child = spawn('rclone', args, { stdio: ['ignore', 'ignore', 'pipe'] })
			let stderrBuf = ''
			let settled = false

			const timeout = setTimeout(() => {
				if (settled) return
				settled = true
				child.kill()
				resolve({ ok: false, reason: `timed out after ${timeoutMs}ms` })
			}, timeoutMs)

			child.stderr.on('data', (data: Buffer) => {
				stderrBuf += data.toString()
			})

			child.on('error', (err) => {
				if (settled) return
				settled = true
				clearTimeout(timeout)
				resolve({ ok: false, reason: err.message })
			})

			child.on('close', (code) => {
				if (settled) return
				settled = true
				clearTimeout(timeout)
				if (code === 0) {
					resolve({ ok: true })
				} else {
					resolve({ ok: false, reason: stderrBuf.trim() || `rclone exited with code ${code}` })
				}
			})
		})
	}

	private run(command: string, args: string[]): Promise<void> {
		return new Promise((resolve, reject) => {
			const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })

			let stdoutBuf = ''
			child.stdout.on('data', (data: Buffer) => {
				stdoutBuf += data.toString()
				const lines = stdoutBuf.split('\n')
				stdoutBuf = lines.pop() ?? ''
				for (const line of lines) {
					this.logger.stdout(line)
				}
			})

			let stderrBuf = ''
			child.stderr.on('data', (data: Buffer) => {
				stderrBuf += data.toString()
				const lines = stderrBuf.split('\n')
				stderrBuf = lines.pop() ?? ''
				for (const line of lines) {
					this.logger.stderr(line)
				}
			})

			child.on('error', (err) => {
				reject(err)
			})

			child.on('close', (code) => {
				if (stdoutBuf.length > 0) this.logger.stdout(stdoutBuf)
				if (stderrBuf.length > 0) this.logger.stderr(stderrBuf)

				if (code === 0) {
					resolve()
				} else {
					reject(new Error(`rclone exited with code ${code}`))
				}
			})
		})
	}
}
