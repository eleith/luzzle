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
	id: 'published-id',
	type: 'books',
	slug: 'book',
	title: 'Published book',
	assets: []
}
const tags = [{ slug: 'fiction', tag: 'Fiction' }]
const presentation = {
	revision: 'published-revision',
	body: '<article>Published</article>',
	head: '<title>Published</title><style data-prepared-theme>/* published */</style>',
	navBanner: { background: 'var(--color-primary)' }
}

function event() {
	const parent = vi
		.fn()
		.mockResolvedValue({ piece, tags, publication: { markdownStatus: 'matching' } })
	const url = new URL('https://garden.example/admin/piece/book.books.md/published/page')
	return { parent, url, params: { path: 'book.books.md' } } as unknown as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	renderPreparedPiecePage.mockResolvedValue(presentation)
})

afterEach(() => {
	expect(selectFrom).not.toHaveBeenCalled()
	expect(getOpenWorkflowBackend).not.toHaveBeenCalled()
})

test('unit loader forwards the parent serving piece, tags and request URL with no preview context', async () => {
	const request = event()
	const result = await load(request)
	expect(request.parent).toHaveBeenCalledOnce()
	expect(renderPreparedPiecePage).toHaveBeenCalledExactlyOnceWith({ piece, tags, url: request.url })
	expect(result).toEqual({ presentation })
	expect(JSON.parse(JSON.stringify(result))).toEqual(result)
})

test('returns a null presentation for legacy fallback without reloading parent data', async () => {
	renderPreparedPiecePage.mockResolvedValue(null)
	const request = event()
	expect(await load(request)).toEqual({ presentation: null })
	expect(request.parent).toHaveBeenCalledOnce()
	expect(renderPreparedPiecePage).toHaveBeenCalledOnce()
})

test.each([404, 500])(
	'preserves a parent %i error without attempting rendering',
	async (status) => {
		const request = event()
		let failure: unknown
		try {
			error(status, 'Published parent failed')
		} catch (caught) {
			failure = caught
		}
		vi.mocked(request.parent).mockRejectedValueOnce(failure)
		await expect(load(request)).rejects.toBe(failure)
		expect(renderPreparedPiecePage).not.toHaveBeenCalled()
	}
)
