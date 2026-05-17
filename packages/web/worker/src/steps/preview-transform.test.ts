import { describe, test, expect, vi, beforeEach } from 'vitest'
import { previewTransformStep } from './preview-transform.js'
import { getTransforms } from '../transforms/index.js'
import type { Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WorkerContext } from '../services/context.js'
import type { ParsedPreview } from './preview-parse.js'

vi.mock('../transforms/index.js')

const mocks = {
	getTransforms: vi.mocked(getTransforms),
}

function makeCtx(): WorkerContext {
	return {
		config: { assets: { salt: 'test-salt' } } as unknown as Config,
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

const parsed: ParsedPreview = {
	type: 'books',
	slug: 'my-book',
	webPiece: { file_path: 'books/my-book.books.md', key: 'k' } as unknown as ParsedPreview['webPiece'],
	pathToKey: new Map([['images/foo.jpg', 'k1']]),
	keyToPath: new Map([['k1', 'images/foo.jpg']]),
	sanitizedFrontmatter: { title: 'Hello' },
	note: 'a note',
}

describe('previewTransformStep', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('delegates to the named transform with keyToPath', async () => {
		const palette = { run: vi.fn().mockResolvedValue([{ transformation: 'palette' }]) }
		mocks.getTransforms.mockReturnValue(new Map([['palette', palette]]))

		const result = await previewTransformStep('palette').run(
			{ parsed, pieces: {} as Pieces },
			makeCtx()
		)

		expect(result.status).toBe('completed')
		if (result.status !== 'completed') return
		expect(result.value).toEqual([{ transformation: 'palette' }])
		expect(result.message).toBe('1 record(s)')
		expect(palette.run).toHaveBeenCalledWith(
			expect.objectContaining({
				webPiece: parsed.webPiece,
				assetKeyToPath: parsed.keyToPath,
			})
		)
	})

	test('returns empty value when the transform is not registered', async () => {
		mocks.getTransforms.mockReturnValue(new Map())

		const result = await previewTransformStep('markdown').run(
			{ parsed, pieces: {} as Pieces },
			makeCtx()
		)
		expect(result.status).toBe('completed')
		if (result.status !== 'completed') return
		expect(result.value).toEqual([])
		expect(result.message).toBe('0 record(s)')
	})

	test('Step.name matches the transform name', () => {
		const step = previewTransformStep('highlight')
		expect(step.name).toBe('highlight')
	})
})
