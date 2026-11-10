import { beforeEach, expect, test, vi } from 'vitest'
import { Pieces } from '@luzzle/core'
import { getPiecePublicationState } from '#lib/pieces/publication.server.js'
import { MarkdownPublicationStatus } from '#lib/pieces/types.js'
import { getStorage } from '#lib/server/storage.js'
import { getOpenWorkflow, getOpenWorkflowBackend } from '#lib/server/workflow/index.js'
import { withPublishAdmission } from '#lib/server/workflow/publish.js'
import { GET } from './+server.js'

vi.mock('#lib/server/config.js', () => ({ config: { pieces: [{ type: 'books' }] } }))
vi.mock('#lib/server/pieces.js', () => ({
	getPieces: () => ({ parseFilename: Pieces.prototype.parseFilename })
}))
vi.mock('#lib/pieces/publication.server.js', () => ({ getPiecePublicationState: vi.fn() }))
vi.mock('#lib/server/storage.js', () => ({ getStorage: vi.fn() }))
vi.mock('#lib/server/workflow/index.js', () => ({
	getOpenWorkflow: vi.fn(),
	getOpenWorkflowBackend: vi.fn()
}))
vi.mock('#lib/server/workflow/publish.js', () => ({
	findInFlightPublishRun: vi.fn(),
	validateAuditForPublish: vi.fn(),
	withPublishAdmission: vi.fn()
}))

const filePath = '書 shelves/été?draft=1&tag=#%.books.md'
function event(path: string | null = filePath) {
	const url = new URL('http://localhost/api/admin/publish')
	if (path !== null) url.search = new URLSearchParams({ filePath: path }).toString()
	return { url } as Parameters<typeof GET>[0]
}

function expectReadOnly() {
	expect(withPublishAdmission).not.toHaveBeenCalled()
	expect(getOpenWorkflow).not.toHaveBeenCalled()
	expect(getOpenWorkflowBackend).not.toHaveBeenCalled()
	expect(getStorage).not.toHaveBeenCalled()
}

beforeEach(() => vi.resetAllMocks())

test('GET returns the exact shared publication state for the canonical filename without queueing', async () => {
	const state = {
		hasPublishedVersion: true,
		markdownPublicationStatus: MarkdownPublicationStatus.CHANGED
	}
	vi.mocked(getPiecePublicationState).mockResolvedValue(state)

	const response = await GET(event())

	expect(response.status).toBe(200)
	expect(await response.json()).toEqual(state)
	expect(getPiecePublicationState).toHaveBeenCalledExactlyOnceWith(filePath)
	expectReadOnly()
})

test.each([null, `../${filePath}`, '/absolute.books.md', 'one.unsupported.md'])(
	'GET rejects invalid or unsupported filePath %j without reading or queueing',
	async (path) => {
		const response = await GET(event(path))
		expect(response.status).toBe(400)
		expect(getPiecePublicationState).not.toHaveBeenCalled()
		expectReadOnly()
	}
)

test('GET reports a read failure as HTTP failure without admitting work', async () => {
	vi.mocked(getPiecePublicationState).mockRejectedValue(new Error('database unavailable'))
	const response = await GET(event())
	expect(response.status).toBe(500)
	expectReadOnly()
})
