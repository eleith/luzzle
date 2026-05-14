import { Sidequest } from 'sidequest'

export async function configureQueue(dbPath: string): Promise<void> {
	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: dbPath
		},
		maxConcurrentJobs: 1
	})
}
