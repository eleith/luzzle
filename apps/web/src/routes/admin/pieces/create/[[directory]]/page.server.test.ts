import { afterEach, expect, test, vi } from 'vitest'
import { getPieces, promptToPiece } from '$lib/server/pieces'
import { actions } from './+page.server'

vi.mock('$lib/server/pieces', () => ({ getPieces: vi.fn(), promptToPiece: vi.fn() }))
vi.mock('$lib/server/config', () => ({
	config: { pieces: [{ type: 'books', fields: { title: 'title' } }], ai: { api_key: 'test' } }
}))

afterEach(() => {
	vi.mocked(getPieces).mockReset()
	vi.mocked(promptToPiece).mockReset()
	vi.restoreAllMocks()
})

function setupCreate() {
	const markdown = {
		filePath: 'books/example.books.md',
		piece: 'books',
		frontmatter: { title: 'Example' },
		note: ''
	}
	const piece = {
		create: vi.fn().mockResolvedValue(markdown),
		setField: vi.fn().mockResolvedValue(markdown),
		write: vi.fn().mockResolvedValue(undefined),
		schema: { title: 'books' }
	}
	vi.mocked(getPieces).mockReturnValue({
		getTypes: vi.fn().mockResolvedValue(['books']),
		getPiece: vi.fn().mockResolvedValue(piece)
	} as unknown as ReturnType<typeof getPieces>)

	const formData = new FormData()
	formData.set('type', 'books')
	formData.set('name', 'Example')
	formData.set('directory', 'books')
	formData.set('generate', 'true')
	formData.set('prompt', 'Find publication details')
	const event = {
		params: { directory: 'books' },
		request: { formData: async () => formData }
	} as unknown as Parameters<typeof actions.create>[0]

	return { markdown, piece, formData, event }
}

test('failed generation leaves the draft unsaved and returns inputs for retry', async () => {
	const { piece, event } = setupCreate()
	vi.mocked(promptToPiece).mockRejectedValue(new Error('quota exceeded'))
	vi.spyOn(console, 'error').mockImplementation(() => {})

	const result = await actions.create(event)

	expect(piece.write).not.toHaveBeenCalled()
	expect(result).toMatchObject({
		status: 500,
		data: {
			error: { message: 'Generation failed: quota exceeded' },
			name: 'Example',
			type: 'books',
			directory: 'books',
			prompt: 'Find publication details',
			generate: true
		}
	})
})

test('an unreadable attachment does not create a piece', async () => {
	const { piece, formData, event } = setupCreate()
	const file = new File(['content'], 'attachment.txt')
	vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('attachment unreadable'))
	formData.append('files', file)
	vi.spyOn(console, 'error').mockImplementation(() => {})

	const result = await actions.create(event)

	expect(piece.write).not.toHaveBeenCalled()
	expect(promptToPiece).not.toHaveBeenCalled()
	expect(result).toMatchObject({
		status: 500,
		data: { error: { message: 'Generation failed: attachment unreadable' } }
	})
})

test('successful generation writes the piece before presenting the review', async () => {
	const { markdown, piece, event } = setupCreate()
	vi.mocked(promptToPiece).mockResolvedValue({ title: 'Generated' })

	const result = await actions.create(event)

	expect(piece.write).toHaveBeenCalledWith(markdown)
	expect(vi.mocked(promptToPiece).mock.invocationCallOrder[0]).toBeLessThan(
		piece.write.mock.invocationCallOrder[0]
	)
	expect(result).toMatchObject({ filePath: markdown.filePath, fields: { title: 'Generated' } })
})

test('a write failure after generation returns a creation error', async () => {
	const { piece, event } = setupCreate()
	vi.mocked(promptToPiece).mockResolvedValue({ title: 'Generated' })
	piece.write.mockRejectedValueOnce(new Error('disk full'))
	vi.spyOn(console, 'error').mockImplementation(() => {})

	const result = await actions.create(event)

	expect(result).toMatchObject({
		status: 400,
		data: { error: { message: 'failed to create piece: Error: disk full' } }
	})
})

test('plain create still writes without generating', async () => {
	const { markdown, piece, formData, event } = setupCreate()
	formData.delete('generate')

	await expect(actions.create(event)).rejects.toMatchObject({
		status: 303,
		location: `/admin/piece/${markdown.filePath}/source`
	})
	expect(piece.write).toHaveBeenCalledWith(markdown)
	expect(promptToPiece).not.toHaveBeenCalled()
})
