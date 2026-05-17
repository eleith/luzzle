import { spawn } from 'child_process'
import type { Logger } from './logger.js'

export interface RcloneBisyncOptions {
	localPath: string
	remote: string
	remotePath: string
	configPath: string
	workdir: string
	resync?: boolean
}

export interface RcloneSyncOptions {
	localPath: string
	remote: string
	remotePath: string
	configPath: string
}

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

		this.logger.info('rclone bisync starting', {
			local: options.localPath,
			remote: `${options.remote}:${options.remotePath}`,
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

		this.logger.info('rclone sync starting', {
			local: options.localPath,
			remote: `${options.remote}:${options.remotePath}`,
		})

		await this.run('rclone', args)
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
