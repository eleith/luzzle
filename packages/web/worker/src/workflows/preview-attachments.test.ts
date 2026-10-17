import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { validateConfig } from '@luzzle/web.config'
import type { PreviewPayload, PreviewResult } from '@luzzle/web.jobs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { registerPreviewWorkflow } from './preview.js'
import { getWorkerContext, type WorkerContext } from '../services/context.js'
import { previewParseStep, type ParsedPreview } from '../steps/preview-parse.js'
import { getTransforms } from '../transforms/index.js'
import { run as attachment } from '../transforms/attachment.js'
import { generateAssetKey } from '../assets/key.js'
import { completed } from '../core/step.js'
import type { DurableStepApi } from '../core/run-progress-phase.js'
import type { AppDatabase } from '../services/db.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { makeLogger } from '../../test/logger.js'

const { implementWorkflow } = vi.hoisted(() => ({ implementWorkflow: vi.fn() }))
vi.mock('@luzzle/web.jobs', () => ({ getOpenWorkflow: () => ({ implementWorkflow }) }))
vi.mock('../services/context.js', () => ({
	getWorkerContext: vi.fn(),
	createPhaseContext: (ctx: WorkerContext) => ctx,
}))
vi.mock('../steps/preview-parse.js', () => ({ previewParseStep: { run: vi.fn() } }))
vi.mock('../transforms/index.js', () => ({ getTransforms: vi.fn() }))

type PreviewWorkflow = (args: {
	input: PreviewPayload
	run: { id: string }
	step: DurableStepApi
}) => Promise<PreviewResult>

// Keep this independent of PREVIEW_TRANSFORM_NAMES so omission from production is caught.
const phases = ['markdown', 'highlight', 'palette', 'image', 'attachment', 'opengraph']

describe('preview attachment production', () => {
	let directory: string
	let ctx: WorkerContext
	let parsed: ParsedPreview
	let workflow: PreviewWorkflow
	let step: DurableStepApi
	let opengraph: ReturnType<typeof vi.fn>

	beforeEach(async () => {
		vi.clearAllMocks()
		directory = await mkdtemp(path.join(tmpdir(), 'luzzle-preview-attachments-'))
		ctx = {
			db: (await setupDatabase()).withTables<AppDatabase>(),
			logger: makeLogger(),
			rclone: {} as WorkerContext['rclone'],
			config: validateConfig(
				{
					storage: { root: directory },
					paths: { assets: path.join(directory, 'generated', 'pieces') },
					assets: { salt: 'preview-test' },
					pieces: [
						{
							type: 'snippets',
							fields: { title: 'title', date_consumed: 'date', attachments: ['files[*].file'] },
						},
					],
				},
				{}
			),
		}
		const source = '.assets/fibonacci.py'
		const assetKey = generateAssetKey(source, ctx.config.assets.salt)
		const frontmatter = {
			title: 'Fibonacci',
			files: [{ file: assetKey }, { file: 'unmapped-key' }],
		}
		parsed = {
			type: 'snippets',
			slug: 'fibonacci',
			webPiece: {
				id: 'preview',
				key: 'piece-key',
				type: 'snippets',
				slug: 'fibonacci',
				title: 'Fibonacci',
				file_path: 'fibonacci.snippets.md',
				date_added: 1,
				json_metadata: JSON.stringify(frontmatter),
			},
			sanitizedFrontmatter: frontmatter,
			note: '',
			pathToKey: new Map([[source, assetKey]]),
			keyToPath: new Map([[assetKey, source]]),
		}
		await mkdir(path.join(directory, '.assets'))
		await writeFile(path.join(directory, source), 'def fibonacci(n):\n    return n\n')
		vi.mocked(getWorkerContext).mockReturnValue(ctx)
		vi.mocked(previewParseStep.run).mockResolvedValue(completed(parsed))
		opengraph = vi.fn().mockResolvedValue([])
		vi.mocked(getTransforms).mockReturnValue(
			new Map<string, { run: typeof attachment }>([
				...phases.map((name) => [name, { run: vi.fn().mockResolvedValue([]) }] as const),
				['attachment', { run: attachment }],
				['opengraph', { run: opengraph }],
			])
		)
		step = { run: vi.fn(async (_options, fn) => await fn()) } as DurableStepApi
		registerPreviewWorkflow()
		workflow = implementWorkflow.mock.calls[0][1] as PreviewWorkflow
	})

	afterEach(async () => {
		vi.restoreAllMocks()
		await teardownDatabase(ctx.db)
		await rm(directory, { recursive: true, force: true })
	})

	test('copies the real attachment into the job directory and returns keyed shared output records', async () => {
		const result = await workflow({
			input: { filePath: parsed.webPiece.file_path },
			run: { id: 'job-one' },
			step,
		})
		const expected = {
			piece_asset_path: '.assets/fibonacci.py',
			asset_key: parsed.pathToKey.get('.assets/fibonacci.py'),
			transformation: 'attachment',
			asset_path: 'snippets/piece-key/fibonacci.py',
			mime_type: 'application/octet-stream',
		}

		expect(vi.mocked(step.run).mock.calls.map(([options]) => options.name)).toEqual([
			'parse',
			...phases,
		])
		expect(result.transforms).toEqual([expected])
		expect(result.pathToKey).toEqual(Object.fromEntries(parsed.pathToKey))
		const persisted: PreviewResult = JSON.parse(JSON.stringify(result))
		expect(persisted.transforms).toEqual([expected])
		expect(
			await readFile(path.join(directory, 'generated/previews/job-one', expected.asset_path))
		).toEqual(await readFile(path.join(directory, expected.piece_asset_path)))
		expect(opengraph).toHaveBeenCalledWith(
			expect.objectContaining({
				priorAssets: [
					expect.objectContaining({
						asset_key: expected.asset_key,
						transformation: 'attachment',
						asset_path: expected.asset_path,
					}),
				],
			})
		)
		expect(
			await ctx.db
				.selectFrom('job_progress')
				.select(['phase', 'status', 'message'])
				.where('phase', '=', 'attachment')
				.execute()
		).toEqual([{ phase: 'attachment', status: 'completed', message: '1 record(s)' }])
	})

	test('does not report a generated attachment when the source cannot be copied', async () => {
		await rm(path.join(directory, '.assets/fibonacci.py'))
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const result = await workflow({
			input: { filePath: parsed.webPiece.file_path },
			run: { id: 'job-failed' },
			step,
		})

		expect(result.transforms).toEqual([])
		expect(opengraph).toHaveBeenCalledWith(expect.objectContaining({ priorAssets: [] }))
		expect(
			await ctx.db
				.selectFrom('job_progress')
				.select(['phase', 'status'])
				.where('phase', '=', 'attachment')
				.execute()
		).toEqual([{ phase: 'attachment', status: 'failed' }])
	})
})
