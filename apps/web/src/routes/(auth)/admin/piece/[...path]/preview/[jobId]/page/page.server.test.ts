import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { error } from '@sveltejs/kit'
import { load } from './+page.server.js'

const { renderPreparedPiecePage, selectFrom, getOpenWorkflowBackend } = vi.hoisted(() => ({
	renderPreparedPiecePage: vi.fn(),
	selectFrom: vi.fn(() => {
		throw new Error('child page must not query the database')
	}),
	getOpenWorkflowBackend: vi.fn(() => {
		throw new Error('child page must not query the worker')
	})
}))
vi.mock('$lib/server/piece-page.js', () => ({ renderPreparedPiecePage }))
vi.mock('$lib/server/database/index.js', () => ({ db: { selectFrom } }))
vi.mock('$lib/server/workflow/index.js', () => ({ getOpenWorkflowBackend }))

const piece = {
	id: 'same-piece-id',
	type: 'books',
	slug: 'book',
	title: 'Preview book',
	assets: []
}
const tags = [{ slug: 'draft', tag: 'Draft' }]
const presentation = {
	revision: 'preview-revision',
	body: '<article>Preview</article>',
	head: '<title>Preview</title><style data-prepared-theme>/* preview */</style>',
	navBanner: { color: 'var(--color-on-surface)' }
}

function event(data: object = { status: 'completed', piece, tags }, jobId = 'selected job') {
	const parent = vi.fn().mockResolvedValue(data)
	const url = new URL(
		`https://garden.example/admin/piece/book.books.md/preview/${encodeURIComponent(jobId)}/page`
	)
	return { parent, url, params: { path: 'book.books.md', jobId } } as unknown as Parameters<
		typeof load
	>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	renderPreparedPiecePage.mockResolvedValue(presentation)
})

afterEach(() => {
	expect(selectFrom).not.toHaveBeenCalled()
	expect(getOpenWorkflowBackend).not.toHaveBeenCalled()
})

test('unit loader renders only the assembled completed parent piece and binds params.jobId', async () => {
	const request = event({
		status: 'completed',
		piece,
		tags,
		job: 'not-the-selected-job',
		output: 'not read by child'
	})
	const result = await load(request)
	expect(request.parent).toHaveBeenCalledOnce()
	expect(renderPreparedPiecePage).toHaveBeenCalledExactlyOnceWith({
		piece,
		tags,
		url: request.url,
		previewJob: 'selected job'
	})
	expect(result).toEqual({ presentation })
	expect(JSON.parse(JSON.stringify(result))).toEqual(result)
})

test.each(['waiting', 'running', 'failed', 'expired'])(
	'%s previews skip rendering without accessing piece or tags',
	async (status) => {
		const request = event({
			status,
			get piece() {
				throw new Error('unavailable piece must not be accessed')
			},
			get tags() {
				throw new Error('unavailable tags must not be accessed')
			}
		})
		expect(await load(request)).toEqual({ presentation: null })
		expect(request.parent).toHaveBeenCalledOnce()
		expect(renderPreparedPiecePage).not.toHaveBeenCalled()
	}
)

test.each([undefined, null])(
	'completed preview without a piece (%j) skips rendering and tags',
	async (missing) => {
		const request = event({
			status: 'completed',
			piece: missing,
			get tags() {
				throw new Error('tags must not be accessed without a piece')
			}
		})
		expect(await load(request)).toEqual({ presentation: null })
		expect(renderPreparedPiecePage).not.toHaveBeenCalled()
	}
)

test('the same piece id in two jobs is forwarded in distinct per-request preview contexts', async () => {
	const first = event({ status: 'completed', piece, tags }, 'job1')
	const second = event({ status: 'completed', piece, tags }, 'job2')
	await load(first)
	await Promise.resolve()
	await load(second)
	expect(renderPreparedPiecePage).toHaveBeenNthCalledWith(1, {
		piece,
		tags,
		url: first.url,
		previewJob: 'job1'
	})
	expect(renderPreparedPiecePage).toHaveBeenNthCalledWith(2, {
		piece,
		tags,
		url: second.url,
		previewJob: 'job2'
	})
	expect(renderPreparedPiecePage).toHaveBeenCalledTimes(2)
})

test('completed rendering can request the legacy presentation fallback', async () => {
	renderPreparedPiecePage.mockResolvedValue(null)
	expect(await load(event())).toEqual({ presentation: null })
	expect(renderPreparedPiecePage).toHaveBeenCalledOnce()
})

test.each([404, 500])(
	'does not turn a parent %i into an empty or successful preview',
	async (status) => {
		const request = event()
		let failure: unknown
		try {
			error(status, 'Preview parent failed')
		} catch (caught) {
			failure = caught
		}
		vi.mocked(request.parent).mockRejectedValueOnce(failure)
		await expect(load(request)).rejects.toBe(failure)
		expect(renderPreparedPiecePage).not.toHaveBeenCalled()
	}
)
