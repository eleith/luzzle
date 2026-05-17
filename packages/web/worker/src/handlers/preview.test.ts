import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Preview } from './preview.js'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import { parsePreview, runPreviewTransform } from '../lib/preview.js'
import { JobProgress } from '../lib/job-progress.js'
import { generateAssetKey } from '../assets/key.js'
import { setWorkerContext, type WorkerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('@luzzle/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@luzzle/core')>()
	return {
		...actual,
		Pieces: vi.fn(),
		StorageFileSystem: vi.fn(),
	}
})
vi.mock('../lib/preview.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../lib/preview.js')>()
	return {
		...actual,
		parsePreview: vi.fn(),
		runPreviewTransform: vi.fn(),
	}
})
vi.mock('../lib/job-progress.js', () => ({
	JobProgress: vi.fn().mockImplementation(() => ({
		start: vi.fn().mockResolvedValue(undefined),
		complete: vi.fn().mockResolvedValue(undefined),
		fail: vi.fn().mockResolvedValue(undefined),
		skip: vi.fn().mockResolvedValue(undefined),
		purgeOld: vi.fn().mockResolvedValue(undefined),
	})),
}))
vi.mock('../assets/key.js')

const mocks = {
	parsePreview: vi.mocked(parsePreview),
	runPreviewTransform: vi.mocked(runPreviewTransform),
	JobProgress: vi.mocked(JobProgress),
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	generateAssetKey: vi.mocked(generateAssetKey),
}

function makeContext(): WorkerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
	return {
		config: { storage: { root: '/archive' }, assets: { salt: 's' } } as unknown as Config,
		logger,
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

const parsedFixture = {
	type: 'books',
	slug: 'my-book',
	webPiece: { file_path: 'books/my-book.books.md', key: 'piece-key' },
	pathToKey: new Map([['images/foo.jpg', 'k1']]),
	keyToPath: new Map([['k1', 'images/foo.jpg']]),
	sanitizedFrontmatter: { title: 'Hello' },
	note: 'note body',
}

describe('handlers/Preview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.parsePreview.mockResolvedValue(parsedFixture as unknown as Awaited<ReturnType<typeof parsePreview>>)
		mocks.runPreviewTransform.mockResolvedValue([])
		mocks.generateAssetKey.mockImplementation((path) => `key:${path}`)
	})

	test('runs parse + each transform phase and returns assembled result', async () => {
		mocks.runPreviewTransform
			.mockResolvedValueOnce([{ transformation: 'markdown', mime_type: 'text/html', content: '<p>x</p>' }])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{ transformation: 'palette', mime_type: 'application/json', content: '{}' },
			])

		const ctx = makeContext()
		setWorkerContext(ctx)

		const preview = new Preview()
		// @ts-expect-error - mock id
		preview.id = 42

		const result = await preview.run({ filePath: 'books/my-book.books.md' })

		expect(result.filePath).toBe('books/my-book.books.md')
		expect(result.type).toBe('books')
		expect(result.slug).toBe('my-book')
		expect(result.pieceKey).toBe('piece-key')
		expect(result.note).toBe('note body')
		expect(result.pathToKey).toEqual({ 'images/foo.jpg': 'k1' })
		expect(result.transforms).toHaveLength(2)
		expect(result.transforms[0].asset_key).toBe('key:books/my-book.books.md')
		expect(result.transforms[1].asset_key).toBe('key:books/my-book.books.md')

		const progress = mocks.JobProgress.mock.results[0].value
		expect(progress.start).toHaveBeenCalledWith(42, 'parse')
		expect(progress.complete).toHaveBeenCalledWith(42, 'parse')
		expect(progress.start).toHaveBeenCalledWith(42, 'markdown')
		expect(progress.start).toHaveBeenCalledWith(42, 'highlight')
		expect(progress.start).toHaveBeenCalledWith(42, 'palette')
	})

	test('throws when parse fails and never runs transforms', async () => {
		mocks.parsePreview.mockRejectedValueOnce(new Error('bad file'))

		const ctx = makeContext()
		setWorkerContext(ctx)

		const preview = new Preview()
		// @ts-expect-error - mock id
		preview.id = 7

		await expect(preview.run({ filePath: 'nope.md' })).rejects.toThrow('bad file')

		const progress = mocks.JobProgress.mock.results[0].value
		expect(progress.fail).toHaveBeenCalledWith(7, 'parse', expect.any(Error))
		expect(mocks.runPreviewTransform).not.toHaveBeenCalled()
	})

	test('a transform-phase failure is recorded but does not abort the pipeline', async () => {
		mocks.runPreviewTransform
			.mockResolvedValueOnce([])
			.mockRejectedValueOnce(new Error('shiki blew up'))
			.mockResolvedValueOnce([])

		const ctx = makeContext()
		setWorkerContext(ctx)

		const preview = new Preview()
		// @ts-expect-error - mock id
		preview.id = 9

		const result = await preview.run({ filePath: 'x.md' })

		expect(result.transforms).toEqual([])
		const progress = mocks.JobProgress.mock.results[0].value
		expect(progress.fail).toHaveBeenCalledWith(9, 'highlight', expect.any(Error))
		expect(progress.complete).toHaveBeenCalledWith(9, 'markdown', '0 record(s)')
		expect(progress.complete).toHaveBeenCalledWith(9, 'palette', '0 record(s)')
	})
})
