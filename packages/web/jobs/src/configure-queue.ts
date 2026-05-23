import { Sidequest } from 'sidequest'

export interface ProducerQueueOptions {
	dbPath: string
}

export interface ConsumerQueueOptions {
	dbPath: string
	jobsFilePath: string
}

/**
 * Configure Sidequest for a producer (enqueuer) process.
 *
 * Producers only build job rows and write them to the queue backend;
 * they never resolve handler classes by name, so `manualJobResolution`
 * and `jobsFilePath` are intentionally omitted.
 */
export async function configureProducerQueue(
	opts: ProducerQueueOptions
): Promise<void> {
	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: opts.dbPath
		},
		maxConcurrentJobs: 1
	})
}

/**
 * Configure Sidequest for a consumer (worker) process.
 *
 * Consumers must resolve the dispatched class names back to Job
 * implementations, so the caller must supply the absolute path to a
 * registry file (re-exporting the real Job classes by their `.name`).
 * Manual resolution is required because workers typically run from a
 * compiled `dist/` tree inside a container, where Sidequest's parent-
 * directory auto-discovery is unreliable.
 */
export async function configureConsumerQueue(
	opts: ConsumerQueueOptions
): Promise<void> {
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
