import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Sidequest } from 'sidequest'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

export function resolveJobsFilePath(): string {
	return path.join(SCRIPT_DIR, 'sidequest.jobs.js')
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
