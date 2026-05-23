import { fileURLToPath } from 'node:url'
import { Sidequest } from 'sidequest'

const PRODUCER_STUBS_PATH = fileURLToPath(
	new URL('./stubs/index.js', import.meta.url)
)

export interface ConfigureQueueOptions {
	dbPath: string
	/**
	 * Sidequest's `manualJobResolution` registry path. Defaults to this
	 * package's producer-side stub bundle, which is the correct value for
	 * any explorer/producer process. Consumers (e.g. `@luzzle/web.worker`)
	 * pass their own jobs file listing real Job classes.
	 */
	jobsFilePath?: string
}

export async function configureQueue(opts: ConfigureQueueOptions): Promise<void> {
	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: opts.dbPath
		},
		manualJobResolution: true,
		jobsFilePath: opts.jobsFilePath ?? PRODUCER_STUBS_PATH,
		maxConcurrentJobs: 1
	})
}
