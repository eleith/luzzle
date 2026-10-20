import { randomUUID } from 'node:crypto'
import { rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Config } from '@luzzle/web.config'
import type { Warning } from 'svelte/compiler'
import { buildTemplateBundle } from './bundle.js'
import { writeTemplateBundle } from './write.js'

const revisionsDirectoryName = 'revisions'
const currentFilename = 'current.json'
const currentTemporaryPrefix = '.current-'

export interface PublishedTemplateBundle {
	revision: string
	warnings: Warning[]
}

export async function publishTemplateBundle(
	config: Config,
	preparedDirectory: string
): Promise<PublishedTemplateBundle> {
	const directory = path.resolve(preparedDirectory)
	const bundle = await buildTemplateBundle(config)
	const revision = randomUUID()
	await writeTemplateBundle(bundle, path.join(directory, revisionsDirectoryName, revision))

	const temporaryCurrent = path.join(directory, `${currentTemporaryPrefix}${revision}.json`)
	let pointerWritten = false
	try {
		await writeFile(temporaryCurrent, `${JSON.stringify({ revision })}\n`, {
			encoding: 'utf8',
			flag: 'wx',
		})
		pointerWritten = true
		await rename(temporaryCurrent, path.join(directory, currentFilename))
	} catch (error) {
		// An exclusive-create collision belongs to another writer, not our cleanup.
		if (!pointerWritten && (error as NodeJS.ErrnoException).code === 'EEXIST') throw error
		try {
			await rm(temporaryCurrent, { force: true })
		} catch (cleanupError) {
			throw new AggregateError(
				[error, cleanupError],
				'Template bundle selection failed and its temporary file could not be removed',
				{ cause: error }
			)
		}
		throw error
	}

	return { revision, warnings: bundle.warnings }
}
