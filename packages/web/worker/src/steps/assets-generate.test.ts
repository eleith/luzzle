import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { WorkerContext } from '../services/context.js'
import { makeLogger } from '../../test/logger.js'
import {
	produceTransformsForPiece,
	persistTransforms,
	type ProducedTransform,
} from '../transforms/runner.js'
import { cleanupAllTransforms } from '../transforms/index.js'
import type { PreparedPublication } from './web-sync/index.js'
import { assetsGenerateStep } from './assets-generate.js'

vi.mock('../transforms/runner.js')
vi.mock('../transforms/index.js')

const produce = vi.mocked(produceTransformsForPiece)
const persist = vi.mocked(persistTransforms)
const cleanup = vi.mocked(cleanupAllTransforms)

function prepared(name: string): PreparedPublication {
	return {
		webPiece: {
			id: name,
			key: `${name}-key`,
			title: `Captured ${name}`,
			slug: name,
			file_path: `books/${name}.md`,
			type: 'books',
			date_added: 1,
			note: 'Captured note, not the current index',
			json_metadata: JSON.stringify({ cover: `${name}-cover-key` }),
		},
		contentHash: `${name}-hash`,
		assetKeyToPath: [[`${name}-cover-key`, `books/${name}/captured-cover.png`]],
		wasPublished: true,
	}
}

function generated(assetPath: string): ProducedTransform[] {
	return [
		{
			name: 'image',
			records: [
				{ transformation: 'image.original', asset_path: assetPath, mime_type: 'image/png' },
			],
		},
	]
}

let ctx: WorkerContext
let selectFrom: ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.resetAllMocks()
	selectFrom = vi.fn(() => {
		throw new Error('Publication metadata must not be reread')
	})
	ctx = {
		config: {
			storage: { root: process.cwd() },
			paths: { assets: '/generated/assets' },
		} as WorkerContext['config'],
		logger: makeLogger(),
		rclone: {} as WorkerContext['rclone'],
		db: { selectFrom } as unknown as WorkerContext['db'],
	}
	persist.mockResolvedValue(undefined)
	cleanup.mockResolvedValue(undefined)
})

describe('assetsGenerateStep', () => {
	test('uses supplied publication metadata and asset map, returning only unique generated files', async () => {
		const publication = prepared('captured')
		const produced = generated('captured-cover.png')
		produced[0].records.push(
			{ transformation: 'image.copy', asset_path: 'captured-cover.png', mime_type: 'image/png' },
			{
				transformation: 'image.embedded',
				asset_path: 'embedded.png',
				mime_type: 'image/png',
				is_embedded: 1,
			},
			{ transformation: 'image.metadata', mime_type: 'application/json', content: '{}' }
		)
		produce.mockResolvedValueOnce(produced)

		const result = await assetsGenerateStep.run([publication], ctx)

		expect(produce).toHaveBeenCalledExactlyOnceWith(
			publication.webPiece,
			ctx.config,
			ctx.config.paths.assets,
			expect.anything(),
			{},
			new Map(publication.assetKeyToPath),
			ctx.logger
		)
		expect(selectFrom).not.toHaveBeenCalled()
		expect(persist).toHaveBeenCalledExactlyOnceWith(
			ctx.db,
			publication.webPiece,
			ctx.config,
			produced
		)
		expect(result).toEqual({
			status: 'completed',
			value: { filePaths: ['captured-cover.png'], failedPieces: [] },
		})
		expect(cleanup).toHaveBeenCalledOnce()
	})

	test('continues after generation or persistence failures and excludes their files', async () => {
		const generationFailure = prepared('generation-failure')
		const persistenceFailure = prepared('persistence-failure')
		const healthy = prepared('healthy')
		produce
			.mockRejectedValueOnce(new Error('generation failed'))
			.mockResolvedValueOnce(generated('failed.png'))
			.mockResolvedValueOnce(generated('healthy.png'))
		persist.mockRejectedValueOnce(new Error('persistence failed'))

		const result = await assetsGenerateStep.run(
			[generationFailure, persistenceFailure, healthy],
			ctx
		)

		expect(produce.mock.calls.map(([piece]) => piece.file_path)).toEqual([
			generationFailure.webPiece.file_path,
			persistenceFailure.webPiece.file_path,
			healthy.webPiece.file_path,
		])
		expect(persist.mock.calls.map(([, piece]) => piece.file_path)).toEqual([
			persistenceFailure.webPiece.file_path,
			healthy.webPiece.file_path,
		])
		expect(result).toEqual({
			status: 'completed',
			value: {
				filePaths: ['healthy.png'],
				failedPieces: [
					{ filePath: generationFailure.webPiece.file_path, message: 'generation failed' },
					{ filePath: persistenceFailure.webPiece.file_path, message: 'persistence failed' },
				],
			},
		})
		expect(cleanup).toHaveBeenCalledOnce()
		expect(cleanup.mock.invocationCallOrder[0]).toBeGreaterThan(persist.mock.invocationCallOrder[1])
	})
})
