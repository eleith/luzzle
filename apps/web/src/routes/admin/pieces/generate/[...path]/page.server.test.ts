import { afterEach, expect, test, vi } from 'vitest'
import { getPieces, promptToPiece } from '$lib/server/pieces'
import { actions } from './+page.server'

vi.mock('$lib/server/pieces', () => ({ getPieces: vi.fn(), promptToPiece: vi.fn() }))

afterEach(() => {
	vi.mocked(getPieces).mockReset()
	vi.mocked(promptToPiece).mockReset()
})

test('generate reports the failure without changing the existing piece', async () => {
	const markdown = {
		filePath: 'books/example.books.md',
		piece: 'books',
		frontmatter: { title: 'Example' },
		note: ''
	}
	const piece = {
		get: vi.fn().mockResolvedValue(markdown),
		write: vi.fn(),
		fields: [],
		schema: { title: 'books' }
	}
	vi.mocked(getPieces).mockReturnValue({
		parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		getPiece: vi.fn().mockResolvedValue(piece)
	} as unknown as ReturnType<typeof getPieces>)
	vi.mocked(promptToPiece).mockRejectedValue(new Error('service unavailable'))

	const formData = new FormData()
	formData.set('prompt', 'Find publication details')
	const event = {
		params: { path: markdown.filePath },
		request: { formData: async () => formData }
	} as unknown as Parameters<typeof actions.default>[0]

	const result = await actions.default(event)

	expect(piece.write).not.toHaveBeenCalled()
	expect(result).toMatchObject({
		status: 500,
		data: {
			fields: markdown.frontmatter,
			prompt: 'Find publication details',
			targetField: 'all',
			error: { message: 'Generation failed: service unavailable' }
		}
	})
})
