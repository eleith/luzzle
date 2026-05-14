import { spawn } from 'child_process'
import type { Logger } from '../logger.js'

export interface RcloneBisyncOptions {
	localPath: string
	remote: string
	remotePath: string
	configPath: string
	workdir: string
	resync?: boolean
}

export interface RcloneCopyOptions {
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

	async copy(options: RcloneCopyOptions): Promise<void> {
		const args = [
			'copy',
			options.localPath,
			`${options.remote}:${options.remotePath}`,
			'--config',
			options.configPath,
			'--verbose',
		]

		this.logger.info('rclone copy starting', {
			local: options.localPath,
			remote: `${options.remote}:${options.remotePath}`,
		})

		await this.run('rclone', args)
	}

	private run(command: string, args: string[]): Promise<void> {
		return new Promise((resolve, reject) => {
			const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })

			child.stdout.on('data', (data: Buffer) => {
				this.logger.info('rclone', { output: data.toString().trim() })
			})

			child.stderr.on('data', (data: Buffer) => {
				this.logger.info('rclone', { output: data.toString().trim() })
			})

			child.on('error', (err) => {
				reject(err)
			})

			child.on('close', (code) => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error(`rclone exited with code ${code}`))
				}
			})
		})
	}
}
