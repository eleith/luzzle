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
 * The producer never resolves handler classes by name, so no
 * `jobsFilePath` is required. `manualJobResolution: true` is still
 * required, though — the JobBuilder uses it to stamp each enqueued
 * row with the MANUAL_SCRIPT_TAG marker instead of trying to
 * auto-detect a source-file path from the stub class. Without the
 * flag the worker reads a bogus script path and fails to dispatch.
 */
export async function configureProducerQueue(
	opts: ProducerQueueOptions
): Promise<void> {
	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: opts.dbPath
		},
		manualJobResolution: true,
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
