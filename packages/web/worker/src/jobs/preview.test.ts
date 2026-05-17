import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Preview } from './preview.js'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import { previewParseStep } from '../steps/preview-parse.js'
import { previewTransformStep } from '../steps/preview-transform.js'
import { JobProgress } from '../core/job-progress.js'
import { generateAssetKey } from '../assets/key.js'
import { setWorkerContext, type WorkerContext } from '../services/context.js'
import { completed } from '../core/step.js'
import type { Logger } from '../services/logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('@luzzle/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@luzzle/core')>()
	return { ...actual, Pieces: vi.fn(), StorageFileSystem: vi.fn() }
})

vi.mock('../steps/preview-parse.js', () => ({
	previewParseStep: { name: 'parse', run: vi.fn() },
}))

vi.mock('../steps/preview-transform.js', () => ({
	PREVIEW_TRANSFORM_NAMES: ['markdown', 'highlight', 'palette'] as const,
	previewTransformStep: vi.fn(),
}))

vi.mock('../core/job-progress.js', () => ({
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
	parseRun: vi.mocked(previewParseStep.run),
	transformFactory: vi.mocked(previewTransformStep),
	JobProgress: vi.mocked(JobProgress),
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	generateAssetKey: vi.mocked(generateAssetKey),
}

function makeContext(): WorkerContext {
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		stdout: vi.fn(),
		stderr: vi.fn(),
		setActivePhase: vi.fn(),
		clearActivePhase: vi.fn(),
	} satisfies Logger & {
		setActivePhase: (phase: { jobId: number; phase: string }) => void
		clearActivePhase: () => void
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

describe('jobs/preview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.parseRun.mockResolvedValue(completed(parsedFixture as never))
		mocks.transformFactory.mockImplementation((name) => ({
			name,
			run: vi.fn().mockResolvedValue(completed([], '0 record(s)')),
		}))
		mocks.generateAssetKey.mockImplementation((path) => `key:${path}`)
	})

	test('runs parse + each transform phase and assembles result', async () => {
		mocks.transformFactory
			.mockImplementationOnce((name) => ({
				name,
				run: vi.fn().mockResolvedValue(
					completed(
						[{ transformation: 'markdown', mime_type: 'text/html', content: '<p>x</p>' }],
						'1 record(s)'
					)
				),
			}))
			.mockImplementationOnce((name) => ({
				name,
				run: vi.fn().mockResolvedValue(completed([], '0 record(s)')),
			}))
			.mockImplementationOnce((name) => ({
				name,
				run: vi.fn().mockResolvedValue(
					completed([{ transformation: 'palette', mime_type: 'application/json', content: '{}' }], '1 record(s)')
				),
			}))

		setWorkerContext(makeContext())
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
	})

	test('throws when parse fails and never runs transforms', async () => {
		mocks.parseRun.mockRejectedValueOnce(new Error('bad file'))

		setWorkerContext(makeContext())
		const preview = new Preview()
		// @ts-expect-error - mock id
		preview.id = 7

		await expect(preview.run({ filePath: 'nope.md' })).rejects.toThrow('bad file')
		expect(mocks.transformFactory).not.toHaveBeenCalled()
	})

	test('a transform-phase failure is tolerated and does not abort the pipeline', async () => {
		mocks.transformFactory
			.mockImplementationOnce((name) => ({
				name,
				run: vi.fn().mockResolvedValue(completed([], '0 record(s)')),
			}))
			.mockImplementationOnce((name) => ({
				name,
				run: vi.fn().mockRejectedValue(new Error('shiki blew up')),
			}))
			.mockImplementationOnce((name) => ({
				name,
				run: vi.fn().mockResolvedValue(completed([], '0 record(s)')),
			}))

		setWorkerContext(makeContext())
		const preview = new Preview()
		// @ts-expect-error - mock id
		preview.id = 9

		const result = await preview.run({ filePath: 'x.md' })
		expect(result.transforms).toEqual([])
	})
})
