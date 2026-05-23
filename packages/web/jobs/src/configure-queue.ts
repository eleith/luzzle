import { Sidequest } from 'sidequest'

export interface ConfigureQueueOptions {
	dbPath: string
	jobsFilePath: string
}

export async function configureQueue(opts: ConfigureQueueOptions): Promise<void> {
	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: opts.dbPath
		},
		manualJobResolution: true,
		jobsFilePath: opts.jobsFilePath,
		maxConcurrentJobs: 1
	})
}
