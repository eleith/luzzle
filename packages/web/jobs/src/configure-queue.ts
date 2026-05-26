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
			config: {
				connection: { filename: opts.dbPath },
				pool: {
					afterCreate(conn: { pragma: (s: string) => void }, done: (err: Error | null, conn: unknown) => void) {
						conn.pragma('journal_mode = WAL')
						conn.pragma('busy_timeout = 5000')
						conn.pragma('synchronous = NORMAL')
						conn.pragma('cache_size = 2000')
						done(null, conn)
					},
				},
			},
		},
		manualJobResolution: true,
		jobsFilePath: opts.jobsFilePath ?? VALIDATION_FALLBACK_PATH,
		maxConcurrentJobs: 1
	})
}
