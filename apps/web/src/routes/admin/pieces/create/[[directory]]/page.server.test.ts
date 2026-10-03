import type * as Core from '@luzzle/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
	savePieceAsset,
	setFrontmatterValue,
	type PieceFrontmatter,
	type PieceMarkdown,
	type PieceFrontmatterSchemaField
} from '@luzzle/core'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import { actions, load } from './+page.server'

vi.mock('$lib/server/pieces', () => ({ getPieces: vi.fn() }))
vi.mock('$lib/server/config', () => ({
	config: { pieces: [{ type: 'books', fields: { title: 'title' } }], ai: {} }
}))
vi.mock('@luzzle/core', async (importOriginal) => ({
	...(await importOriginal<typeof Core>()),
	savePieceAsset: vi.fn()
}))

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => {
	vi.resetAllMocks()
	vi.restoreAllMocks()
	config.pieces[0].fields.title = 'title'
})

function setupCreate() {
	const markdown = {
		filePath: 'books/example.books.md',
		piece: 'books',
		frontmatter: { title: 'Default' },
		note: ''
	}
	const piece = {
		type: 'books',
		fields: [] as PieceFrontmatterSchemaField[],
		getFilePath: vi.fn().mockReturnValue(markdown.filePath),
		create: vi.fn().mockResolvedValue(markdown),
		setField: vi.fn(
			async (markdown: PieceMarkdown<PieceFrontmatter>, field: string, value: string) => {
				const updated = structuredClone(markdown)
				setFrontmatterValue(updated.frontmatter, field, value)
				return updated
			}
		),
		write: vi.fn().mockResolvedValue(undefined),
		schema: { title: 'books' }
	}
	const pieces = {
		getTypes: vi.fn().mockResolvedValue(['books']),
		getPiece: vi.fn().mockResolvedValue(piece),
		getFilesIn: vi.fn().mockResolvedValue({ directories: ['nested/', '.assets/'] }),
		isAsset: vi.fn((file: string) => file === '.assets/')
	}
	vi.mocked(getPieces).mockReturnValue(pieces as unknown as ReturnType<typeof getPieces>)

	const formData = new FormData()
	formData.set('type', 'books')
	formData.set('name', 'Example')
	formData.set('directory', 'books')
	const event = {
		params: { directory: 'ignored-route-directory' },
		request: { formData: async () => formData }
	} as unknown as Parameters<typeof actions.create>[0]

	return { markdown, piece, pieces, formData, event }
}

test('load preserves type and directory choices', async () => {
	const { pieces } = setupCreate()
	const result = await load({
		params: { directory: 'books' },
		url: new URL('https://example.test/?type=books')
	} as Parameters<typeof load>[0])
	expect(pieces.getFilesIn).toHaveBeenCalledWith('books')
	expect(result).toEqual({
		types: ['books'],
		type: 'books',
		directory: 'books',
		directories: ['books', 'books/nested']
	})
})

test('plain create initializes, sets the configured title purely and writes exclusively', async () => {
	const { markdown, piece, formData, event } = setupCreate()
	config.pieces[0].fields.title = 'metadata.title'
	formData.set('name', 'https://example.test/title')
	await expect(actions.create(event)).rejects.toMatchObject({
		status: 303,
		location: `/admin/piece/${markdown.filePath}/source`
	})
	expect(piece.create).toHaveBeenCalledWith('books', 'https://example.test/title')
	expect(piece.write).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({
			frontmatter: { title: 'Default', metadata: { title: 'https://example.test/title' } }
		}),
		{ createOnly: true }
	)
	expect(piece.setField).not.toHaveBeenCalled()
	expect(savePieceAsset).not.toHaveBeenCalled()
})

test.each(['create', 'write'] as const)(
	'plain create returns 409 for a %s conflict',
	async (method) => {
		const { piece, event } = setupCreate()
		piece[method].mockRejectedValueOnce(
			Object.assign(new Error('already exists'), { code: 'EEXIST' })
		)
		expect(await actions.create(event)).toMatchObject({
			status: 409,
			data: {
				name: 'Example',
				type: 'books',
				directory: 'books',
				error: { message: expect.stringContaining('already exists') }
			}
		})
	}
)

test.each([
	['type', 'unknown'],
	['type', ''],
	['name', ''],
	['name', '   ']
])('plain create rejects invalid %s=%s without writing', async (field, value) => {
	const { piece, formData, event } = setupCreate()
	formData.set(field, value)
	expect(await actions.create(event)).toMatchObject({
		status: 400,
		data: {
			name: formData.get('name'),
			type: formData.get('type'),
			directory: 'books',
			error: { message: expect.any(String) }
		}
	})
	expect(piece.create).not.toHaveBeenCalled()
	expect(piece.write).not.toHaveBeenCalled()
})

test('plain create requires a configured title field', async () => {
	const { piece, event } = setupCreate()
	config.pieces[0].fields.title = ''
	expect(await actions.create(event)).toMatchObject({ status: 400 })
	expect(piece.create).not.toHaveBeenCalled()
	expect(piece.write).not.toHaveBeenCalled()
})

test('plain create reports write failures with the submitted values', async () => {
	const { piece, event } = setupCreate()
	piece.write.mockRejectedValueOnce(new Error('disk full'))
	expect(await actions.create(event)).toMatchObject({
		status: 400,
		data: {
			name: 'Example',
			type: 'books',
			directory: 'books',
			error: { message: 'failed to create piece: disk full' }
		}
	})
})

test('stale generation inputs still create only an ordinary piece', async () => {
	const { piece, formData, event } = setupCreate()
	formData.set('generate', 'true')
	formData.set('prompt', 'Generate this')
	formData.set('content', '---\ntitle: Ignore this draft\n---')
	await expect(actions.create(event)).rejects.toMatchObject({
		status: 303,
		location: '/admin/piece/books/example.books.md/source'
	})
	expect(piece.write).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ frontmatter: { title: 'Example' }, note: '' }),
		{ createOnly: true }
	)
	expect(savePieceAsset).not.toHaveBeenCalled()
})

test('load defaults to the first type and root folder', async () => {
	const { pieces } = setupCreate()
	expect(
		await load({
			params: {},
			url: new URL('https://example.test/?type=unknown')
		} as Parameters<typeof load>[0])
	).toEqual({
		types: ['books'],
		type: 'books',
		directory: '',
		directories: ['.', 'nested']
	})
	expect(pieces.getFilesIn).toHaveBeenCalledWith('.')
})
