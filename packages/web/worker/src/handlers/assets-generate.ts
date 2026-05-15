import { Job } from '@sidequest/core'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import { getWorkerContext } from './context.js'
import { runAssetsGenerate } from '../lib/assets-generate.js'

export interface AssetsGeneratePayload {
	filePaths: string[]
}

export class AssetsGenerate extends Job {
	async run(payload: AssetsGeneratePayload): Promise<string> {
		const ctx = getWorkerContext()
		const { db, config, logger } = ctx

		const storage = new StorageFileSystem(config.storage.root)
		const pieces = new Pieces(storage)

		await runAssetsGenerate(db, pieces, config, logger, payload.filePaths)

		return 'ok'
	}
}
