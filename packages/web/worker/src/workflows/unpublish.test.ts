import { beforeEach, expect, test, vi } from 'vitest'
import type { UnpublishPayload, UnpublishResult } from '@luzzle/web.jobs'
import { unpublishSpec } from '@luzzle/web.jobs/specs'
import { getWorkerContext } from '../services/context.js'
import type { WorkerContext } from '../services/context.js'
import { unpublishPiece } from '../services/unpublish.js'
import { makeLogger } from '../../test/logger.js'
import { registerUnpublishWorkflow } from './unpublish.js'

const { implementWorkflow } = vi.hoisted(() => ({ implementWorkflow: vi.fn() }))
vi.mock('@luzzle/web.jobs', () => ({
	getOpenWorkflow: () => ({ implementWorkflow }),
}))
vi.mock('../services/context.js', () => ({ getWorkerContext: vi.fn() }))
vi.mock('../services/unpublish.js', () => ({ unpublishPiece: vi.fn() }))

type Handler = (args: {
	input: UnpublishPayload
	run: { id: string }
}) => Promise<UnpublishResult>

const filePath = 'books/withdraw.books.md'
let ctx: WorkerContext

beforeEach(() => {
	vi.clearAllMocks()
	ctx = { logger: makeLogger() } as WorkerContext
	vi.mocked(getWorkerContext).mockReturnValue(ctx)
	vi.mocked(unpublishPiece).mockResolvedValue(undefined)
})

function register(): Handler {
	registerUnpublishWorkflow()
	return implementWorkflow.mock.calls[0][1] as Handler
}

test('registers the declared Unpublish job without executing it', () => {
	register()
	expect(implementWorkflow).toHaveBeenCalledExactlyOnceWith(unpublishSpec, expect.any(Function))
	expect(unpublishPiece).not.toHaveBeenCalled()
})

test('runs the worker operation once and reports completion', async () => {
	const run = register()
	expect(await run({ input: { filePath }, run: { id: 'job-1' } })).toBe('ok')
	expect(unpublishPiece).toHaveBeenCalledExactlyOnceWith(filePath, ctx)
	expect(ctx.logger.info).toHaveBeenCalledWith('unpublish complete', { jobId: 'job-1', filePath })
})

test('reports failure without retrying or claiming completion', async () => {
	const error = new Error('remote deletion refused')
	vi.mocked(unpublishPiece).mockRejectedValueOnce(error)
	const run = register()
	await expect(run({ input: { filePath }, run: { id: 'job-1' } })).rejects.toBe(error)
	expect(unpublishPiece).toHaveBeenCalledTimes(1)
	expect(ctx.logger.error).toHaveBeenCalledWith('unpublish failed', {
		jobId: 'job-1',
		filePath,
		error: 'remote deletion refused',
	})
	expect(ctx.logger.info).not.toHaveBeenCalledWith('unpublish complete', expect.anything())
})
