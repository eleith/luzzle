import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { validateConfig } from '@luzzle/web.config'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { AppDatabase } from '../services/db.js'
import type { PreviewPayload, PreviewResult } from '@luzzle/web.jobs'
import { previewSpec } from '@luzzle/web.jobs/specs'
import { registerPreviewWorkflow } from './preview.js'
import { getWorkerContext, type WorkerContext } from '../services/context.js'
import type * as ContextModule from '../services/context.js'
import { PhaseLogger } from '../core/phase-logger.js'
import { RcloneClient } from '../services/rclone.js'
import { completed } from '../core/step.js'
import type { DurableStepApi } from '../core/run-progress-phase.js'
import { previewParseStep, type ParsedPreview } from '../steps/preview-parse.js'
import { previewTransformStep } from '../steps/preview-transform.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'

const { implementWorkflow } = vi.hoisted(() => ({ implementWorkflow: vi.fn() }))
vi.mock('@luzzle/web.jobs', () => ({ getOpenWorkflow: () => ({ implementWorkflow }) }))
vi.mock('../services/context.js', async (importOriginal) => ({
	...(await importOriginal<typeof ContextModule>()),
	getWorkerContext: vi.fn(),
}))
vi.mock('../steps/preview-parse.js', () => ({ previewParseStep: { name: 'parse', run: vi.fn() } }))
vi.mock('../steps/preview-transform.js', () => ({
	PREVIEW_TRANSFORM_NAMES: ['markdown', 'image'],
	previewTransformStep: vi.fn(),
}))

type PreviewWorkflow = (args: {
	input: PreviewPayload
	run: { id: string }
	step: DurableStepApi
}) => Promise<PreviewResult>

function makeStep(): DurableStepApi {
	return { run: async (_config, fn) => await fn() } as DurableStepApi
}

function parsedPreview(filePath: string): ParsedPreview {
	return {
		type: 'books',
		slug: filePath,
		webPiece: {
			id: 'preview',
			key: filePath,
			title: filePath,
			slug: filePath,
			file_path: filePath,
			type: 'books',
			date_added: 1,
			json_metadata: '{}',
		},
		pathToKey: new Map([['cover.png', 'cover-key']]),
		keyToPath: new Map([['cover-key', 'cover.png']]),
		sanitizedFrontmatter: { title: filePath },
		note: 'preview note',
	}
}

describe('preview phase logging', () => {
	let ctx: WorkerContext
	let workflow: PreviewWorkflow
	let directory: string

	beforeEach(async () => {
		vi.clearAllMocks()
		directory = await mkdtemp(path.join(tmpdir(), 'luzzle-preview-logging-'))
		const db = (await setupDatabase()).withTables<AppDatabase>()
		const logger = new PhaseLogger(
			{
				debug: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				stdout: vi.fn(),
				stderr: vi.fn(),
			},
			db
		)
		ctx = {
			db,
			logger,
			rclone: new RcloneClient(logger),
			config: validateConfig(
				{
					storage: { root: directory },
					paths: { assets: path.join(directory, 'assets', 'pieces') },
				},
				{}
			),
		}
		vi.mocked(getWorkerContext).mockReturnValue(ctx)
		vi.spyOn(console, 'error').mockImplementation(() => {})
		registerPreviewWorkflow()
		expect(implementWorkflow).toHaveBeenCalledWith(previewSpec, expect.any(Function))
		workflow = implementWorkflow.mock.calls[0][1] as PreviewWorkflow
	})

	afterEach(async () => {
		vi.restoreAllMocks()
		await teardownDatabase(ctx.db)
		await rm(directory, { recursive: true, force: true })
	})

	test.each([
		['parse', undefined],
		['markdown', undefined],
		['parse', 'parse'],
		['markdown', 'markdown'],
	])(
		'isolates overlapping %s logging with other failure in %s',
		async (blockedPhase, failedPhase) => {
			let release!: () => void
			let entered!: () => void
			const hold = new Promise<void>((resolve) => {
				release = resolve
			})
			const started = new Promise<void>((resolve) => {
				entered = resolve
			})

			async function logPhase(filePath: string, phase: string, phaseCtx: WorkerContext) {
				expect(phaseCtx.logger).not.toBe(ctx.logger)
				phaseCtx.logger.info(`${filePath}:${phase} start`)
				if (filePath === 'first.books.md' && phase === blockedPhase) {
					entered()
					await hold
				}
				if (filePath === 'other.books.md' && phase === failedPhase) {
					throw new Error('other failed')
				}
				phaseCtx.logger.info(`${filePath}:${phase} end`)
			}

			vi.mocked(previewParseStep.run).mockImplementation(async ({ filePath }, phaseCtx) => {
				await logPhase(filePath, 'parse', phaseCtx)
				return completed(parsedPreview(filePath))
			})
			vi.mocked(previewTransformStep).mockImplementation((name) => ({
				name,
				async run({ parsed }, phaseCtx) {
					await logPhase(parsed.webPiece.file_path, name, phaseCtx)
					return completed([])
				},
			}))

			const first = workflow({
				input: { filePath: 'first.books.md' },
				run: { id: 'job1' },
				step: makeStep(),
			})
			try {
				await Promise.race([
					started,
					first.then(() => {
						throw new Error('First preview completed before overlap')
					}),
				])
				const other = workflow({
					input: { filePath: 'other.books.md' },
					run: { id: 'job2' },
					step: makeStep(),
				})
				if (failedPhase === 'parse') {
					await expect(other).rejects.toThrow('other failed')
				} else {
					expect(await other).toMatchObject({ filePath: 'other.books.md', transforms: [] })
				}
				ctx.logger.info('unscoped during preview')
			} finally {
				release()
				expect(await first).toMatchObject({
					filePath: 'first.books.md',
					type: 'books',
					pieceKey: 'first.books.md',
					pathToKey: { 'cover.png': 'cover-key' },
					note: 'preview note',
					transforms: [],
				})
			}

			const logs = () =>
				ctx.db
					.selectFrom('job_progress_logs')
					.selectAll()
					.orderBy('job_id')
					.orderBy('phase')
					.orderBy('line_number')
					.execute()
			await expect.poll(logs).toHaveLength(failedPhase === 'parse' ? 8 : 12)
			const rows = await logs()
			for (const phase of ['parse', 'markdown', 'image']) {
				expect(rows.filter((row) => row.job_id === 'job1' && row.phase === phase)).toMatchObject([
					{ line_number: 1, level: 'info', message: `first.books.md:${phase} start` },
					{ line_number: 2, level: 'info', message: `first.books.md:${phase} end` },
				])
			}
			if (failedPhase) {
				expect(
					rows.filter((row) => row.job_id === 'job2' && row.phase === failedPhase)
				).toMatchObject([
					{ line_number: 1, level: 'info', message: `other.books.md:${failedPhase} start` },
					{ line_number: 2, level: 'error', message: expect.stringContaining('other failed') },
				])
			}
			expect(
				rows.every(
					(row) => !row.message.includes('openworkflow') && !row.message.includes('unscoped')
				)
			).toBe(true)
			const statuses = await ctx.db.selectFrom('job_progress').selectAll().execute()
			expect(statuses.filter((row) => row.job_id === 'job1').map((row) => row.status)).toEqual([
				'completed',
				'completed',
				'completed',
			])
			if (failedPhase) {
				expect(
					statuses.find((row) => row.job_id === 'job2' && row.phase === failedPhase)?.status
				).toBe('failed')
			}
		}
	)
})
