import { fileURLToPath } from 'node:url'
import { configureQueue as configureSharedQueue } from '@luzzle/web.jobs'

export function resolveJobsFilePath(): string {
	return fileURLToPath(new URL('../sidequest.jobs.js', import.meta.url))
}

export async function configureQueue(dbPath: string): Promise<void> {
	await configureSharedQueue({ dbPath, jobsFilePath: resolveJobsFilePath() })
}
