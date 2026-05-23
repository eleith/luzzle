import { fileURLToPath } from 'node:url'
import { configureQueue as sharedConfigureQueue } from '@luzzle/web.jobs'

export function resolveJobsFilePath(): string {
	return fileURLToPath(new URL('../sidequest.jobs.js', import.meta.url))
}

export async function configureQueue(dbPath: string): Promise<void> {
	await sharedConfigureQueue({ dbPath, jobsFilePath: resolveJobsFilePath() })
}
