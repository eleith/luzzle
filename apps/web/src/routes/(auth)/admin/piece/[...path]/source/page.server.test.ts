import type * as Core from '@luzzle/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
	Piece,
	type LuzzleStorage,
	type PieceFrontmatterSchema,
	type PieceFrontmatter,
	savePieceAsset
} from '@luzzle/core'
import { getPieces } from '#lib/server/pieces.js'
import { getStorage } from '#lib/server/storage.js'
import { actions, load } from './+page.server'
import { config } from '#lib/server/config.js'
import { db } from '#lib/server/database/index.js'
import * as markdownFormatting from '#lib/server/markdown.js'
import { getPiecePublicationState } from '#lib/pieces/publication.server.js'
import { MarkdownPublicationStatus } from '#lib/pieces/types.js'

vi.mock('#lib/server/pieces.js', () => ({ getPieces: vi.fn() }))
vi.mock('#lib/server/storage.js', () => ({ getStorage: vi.fn() }))
vi.mock('#lib/server/database/index.js', () => ({ db: {} }))
vi.mock('#lib/pieces/publication.server.js', () => ({ getPiecePublicationState: vi.fn() }))
vi.mock('#lib/server/config.js', async () => {
	const { makeConfig } = await import('#lib/server/config.fixture.js')
	return { config: makeConfig() }
})
vi.mock('@luzzle/core', async (importOriginal) => ({
	...(await importOriginal<typeof Core>()),
	savePieceAsset: vi.fn()
}))

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => {
	vi.resetAllMocks()
	vi.restoreAllMocks()
})

const file = 'books/example.books.md'
const schema = {
	title: 'books',
	type: 'object',
	properties: { title: { type: 'string' }, cover: { type: 'string' } },
	required: ['title'],
	additionalProperties: false
} as PieceFrontmatterSchema<PieceFrontmatter>

function setup(content: string) {
	const storage = {
		writeFile: vi.fn().mockResolvedValue(undefined),
		readFile: vi.fn(),
		stat: vi.fn(),
		delete: vi.fn()
	}
	vi.mocked(getStorage).mockReturnValue(storage as unknown as ReturnType<typeof getStorage>)
	const piece = new Piece('books', storage as unknown as LuzzleStorage, schema)
	const validate = vi.spyOn(piece, 'validate')
	const write = vi.spyOn(piece, 'write')
	const sync = vi.spyOn(piece, 'syncMarkdown').mockResolvedValue(undefined)
	vi.mocked(getPieces).mockReturnValue({
		parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		getPiece: vi.fn().mockResolvedValue(piece)
	} as unknown as ReturnType<typeof getPieces>)
	const formData = new FormData()
	formData.set('content', content)
	const event = {
		params: { path: file },
		request: { formData: async () => formData }
	} as unknown as Parameters<typeof actions.save>[0]
	return { piece, validate, write, sync, storage, formData, event }
}

test('Save validates a model but writes the exact submitted source before syncing', async () => {
	const content =
		'---\r\n# keep this comment\r\ntitle:   "Reviewed"\r\ncover: \'https://example.test/cover.png\'\r\n---\r\n# Heading\r\n\r\nA   paragraph.  \r\n'
	const { validate, write, sync, storage, event } = setup(content)
	const format = vi.spyOn(markdownFormatting, 'normalizeMarkdown')

	let finishSync!: () => void
	let startSync!: () => void
	const syncStarted = new Promise<void>((resolve) => {
		startSync = resolve
	})
	const syncFinished = new Promise<void>((resolve) => {
		finishSync = resolve
	})
	sync.mockImplementationOnce(() => {
		startSync()
		return syncFinished
	})
	let settled = false
	const saving = actions.save(event).then((result) => {
		settled = true
		return result
	})
	await syncStarted
	expect(settled).toBe(false)
	expect(storage.writeFile).toHaveBeenCalledExactlyOnceWith(file, content)
	finishSync()
	expect(await saving).toEqual({ success: true })
	expect(validate).toHaveBeenCalledExactlyOnceWith({
		filePath: file,
		piece: 'books',
		frontmatter: { title: 'Reviewed', cover: 'https://example.test/cover.png' },
		note: '# Heading\r\n\r\nA   paragraph.'
	})
	expect(storage.writeFile).toHaveBeenCalledExactlyOnceWith(file, content)
	expect(sync).toHaveBeenCalledExactlyOnceWith(db, validate.mock.calls[0][0])
	expect(write).not.toHaveBeenCalled()
	expect(format).not.toHaveBeenCalled()
	expect(savePieceAsset).not.toHaveBeenCalled()
})

test.each([
	['malformed frontmatter', '---\r\ntitle: [broken\r\n---\r\n untouched  '],
	['invalid schema', '---\r\ntitle: 42\r\n---\r\n untouched  ']
])('Save rejects %s before writing', async (_failure, rawContent) => {
	const { storage, sync, event } = setup(rawContent)

	expect(await actions.save(event)).toMatchObject({
		status: 400,
		data: { rawContent, error: { message: expect.stringContaining('failed to save raw piece:') } }
	})
	expect(storage.writeFile).not.toHaveBeenCalled()
	expect(sync).not.toHaveBeenCalled()
	expect(savePieceAsset).not.toHaveBeenCalled()
})

test('Save preserves the draft on write failure and does not sync or retry', async () => {
	const rawContent = '---\r\ntitle: Reviewed\r\n---\r\n untouched  '
	const { storage, sync, event } = setup(rawContent)
	storage.writeFile.mockRejectedValueOnce(new Error('disk full'))

	expect(await actions.save(event)).toMatchObject({
		status: 400,
		data: { rawContent, error: { message: 'failed to save raw piece: disk full' } }
	})
	expect(storage.writeFile).toHaveBeenCalledExactlyOnceWith(file, rawContent)
	expect(sync).not.toHaveBeenCalled()
	expect(storage.delete).not.toHaveBeenCalled()
})

test('Save reports sync failure truthfully without retrying or rolling back the saved file', async () => {
	const rawContent = '---\r\ntitle: Reviewed\r\n---\r\nBody'
	const { validate, storage, sync, event } = setup(rawContent)
	sync.mockRejectedValueOnce(new Error('private database error'))

	expect(await actions.save(event)).toMatchObject({
		status: 500,
		data: {
			rawContent,
			error: { message: 'Markdown was saved, but its database index could not be updated.' }
		}
	})
	expect(storage.writeFile).toHaveBeenCalledExactlyOnceWith(file, rawContent)
	expect(sync).toHaveBeenCalledExactlyOnceWith(db, validate.mock.calls[0][0])
	expect(storage.delete).not.toHaveBeenCalled()
})

test('Format formats the whole buffer including frontmatter without saving, syncing or downloading', async () => {
	const content = '---\r\ntitle:   "Reviewed"\r\n---\r\nA   paragraph.\r\n'
	const { storage, write, sync, event } = setup(content)
	const formattedContent = '---\ntitle: "Reviewed"\n---\n\nA paragraph.\n'
	const format = vi
		.spyOn(markdownFormatting, 'normalizeMarkdown')
		.mockResolvedValueOnce(formattedContent)

	expect(await actions.format(event)).toEqual({ formattedContent })
	expect(format).toHaveBeenCalledExactlyOnceWith(content)
	expect(getPieces).not.toHaveBeenCalled()
	expect(getStorage).not.toHaveBeenCalled()
	expect(storage.writeFile).not.toHaveBeenCalled()
	expect(write).not.toHaveBeenCalled()
	expect(sync).not.toHaveBeenCalled()
	expect(savePieceAsset).not.toHaveBeenCalled()
})

test('Format returns formatter errors without touching the saved file', async () => {
	const { storage, sync, event } = setup('---\ntitle: [broken\n---\nBody')
	vi.spyOn(markdownFormatting, 'normalizeMarkdown').mockRejectedValueOnce(new Error('invalid YAML'))

	expect(await actions.format(event)).toMatchObject({
		status: 400,
		data: { error: { message: 'invalid YAML' } }
	})
	expect(storage.writeFile).not.toHaveBeenCalled()
	expect(sync).not.toHaveBeenCalled()
	expect(savePieceAsset).not.toHaveBeenCalled()
})

const rawSource = '---\r\ntitle: Saved\r\n---\r\n untouched  \r\n'

function setupLoad() {
	const saved = setup('')
	vi.spyOn(saved.piece, 'get').mockResolvedValue({
		filePath: file,
		piece: 'books',
		frontmatter: { title: 'Saved' }
	})
	saved.storage.readFile.mockResolvedValue(rawSource)
	vi.mocked(getPiecePublicationState).mockResolvedValue({
		hasPublishedVersion: false,
		markdownPublicationStatus: MarkdownPublicationStatus.UNKNOWN
	})
	const event = { params: { path: file } } as Parameters<typeof load>[0]
	return { ...saved, event }
}

test('source loader returns raw saved source, schema, generation and publication state without mutations', async () => {
	const { piece, storage, write, sync, event } = setupLoad()
	const publicationState = {
		hasPublishedVersion: true,
		markdownPublicationStatus: MarkdownPublicationStatus.CHANGED
	}
	vi.mocked(getPiecePublicationState).mockResolvedValue(publicationState)

	expect(await load(event)).toEqual({
		file,
		type: 'books',
		rawContent: rawSource,
		schema: piece.schema,
		canGenerate: config.ai !== undefined,
		assetFields: [],
		...publicationState
	})
	expect(getPiecePublicationState).toHaveBeenCalledExactlyOnceWith(file)
	expect(piece.get).toHaveBeenCalledExactlyOnceWith(file)
	expect(storage.readFile).toHaveBeenCalledExactlyOnceWith(file, 'text')
	expect(storage.stat).not.toHaveBeenCalled()
	expect(storage.writeFile).not.toHaveBeenCalled()
	expect(storage.delete).not.toHaveBeenCalled()
	expect(write).not.toHaveBeenCalled()
	expect(sync).not.toHaveBeenCalled()
	expect(savePieceAsset).not.toHaveBeenCalled()
})
