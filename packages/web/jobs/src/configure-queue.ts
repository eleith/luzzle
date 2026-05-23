import { fileURLToPath } from 'node:url'
import { Sidequest } from 'sidequest'

export interface ConfigureQueueOptions {
	dbPath: string
	jobsFilePath?: string
}

const VALIDATION_FALLBACK_PATH = fileURLToPath(import.meta.url)

export async function configureQueue(opts: ConfigureQueueOptions): Promise<void> {
	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: opts.dbPath
		},
		manualJobResolution: true,
		jobsFilePath: opts.jobsFilePath ?? VALIDATION_FALLBACK_PATH,
		maxConcurrentJobs: 1
	})
}
