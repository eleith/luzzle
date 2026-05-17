import { fileURLToPath } from 'node:url'
import { Sidequest } from 'sidequest'

export function resolveJobsFilePath(): string {
	return fileURLToPath(new URL('../sidequest.jobs.js', import.meta.url))
}

export async function configureQueue(dbPath: string): Promise<void> {
	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: dbPath
		},
		manualJobResolution: true,
		jobsFilePath: resolveJobsFilePath(),
		maxConcurrentJobs: 1
	})
}
