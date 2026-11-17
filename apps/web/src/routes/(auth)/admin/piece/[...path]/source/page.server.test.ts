import type * as Core from '@luzzle/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
	Piece,
	type LuzzleStorage,
	type PieceFrontmatterSchema,
	type PieceFrontmatter,
	extractFullMarkdown,
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

function setup(content: string, pieceSchema = schema) {
	const storage = {
		writeFile: vi.fn().mockResolvedValue(undefined),
		readFile: vi.fn(),
		stat: vi.fn(),
		delete: vi.fn()
	}
	vi.mocked(getStorage).mockReturnValue(storage as unknown as ReturnType<typeof getStorage>)
	const piece = new Piece('books', storage as unknown as LuzzleStorage, pieceSchema)
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
	expect(await saving).toEqual({ success: true, savedContent: content })
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

const assetSchema = {
	...schema,
	properties: {
		title: { type: 'string' },
		cover: { type: 'string', format: 'asset' },
		website: { type: 'string' },
		gallery: {
			type: 'array',
			items: {
				type: 'object',
				properties: { image: { type: 'string', format: 'asset' } },
				additionalProperties: false
			}
		}
	}
} as PieceFrontmatterSchema<PieceFrontmatter>

const coverUrl = 'HTTPS://example.test/cover.png'
const assetBody = '# Heading\r\n\r\nA   paragraph.  \r\n'
const assetDraft = `---\r\n# comment and formatting may change when URLs are converted\r\ntitle:   "Reviewed"\r\ncover: '${coverUrl}'\r\nwebsite: '${coverUrl}'\r\ngallery: [{ image: 'https://example.test/gallery.png' }]\r\n---\r\n${assetBody}`

function mockAssetDownloads() {
	const downloads = new Map([
		[coverUrl, '.assets/books/cover.png'],
		['https://example.test/gallery.png', '.assets/books/image.png']
	])
	vi.mocked(savePieceAsset).mockImplementation(async (_file, url) => {
		const assetPath = downloads.get(url)
		if (!assetPath) throw new Error('Unexpected asset URL')
		return assetPath
	})
}

test('Save downloads asset URLs, returns the saved source and leaves the body untouched', async () => {
	const { storage, sync, validate, event } = setup(assetDraft, assetSchema)
	mockAssetDownloads()

	const result = await actions.save(event)
	expect(storage.writeFile).toHaveBeenCalledOnce()
	const savedContent = storage.writeFile.mock.calls[0][1] as string
	expect(result).toEqual({ success: true, savedContent })
	expect(savedContent.endsWith(`---\r\n${assetBody}`)).toBe(true)
	expect(savePieceAsset).toHaveBeenCalledTimes(2)
	expect(savePieceAsset).toHaveBeenCalledWith(file, coverUrl, storage, { name: 'cover' })
	expect(savePieceAsset).toHaveBeenCalledWith(file, 'https://example.test/gallery.png', storage, {
		name: 'image'
	})
	expect(storage.writeFile).toHaveBeenCalledExactlyOnceWith(file, savedContent)
	expect(validate).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({
			frontmatter: {
				title: 'Reviewed',
				cover: '.assets/books/cover.png',
				website: coverUrl,
				gallery: [{ image: '.assets/books/image.png' }]
			}
		})
	)
	expect((await extractFullMarkdown(savedContent)).frontmatter).toEqual(
		validate.mock.calls[0][0].frontmatter
	)
	expect(sync).toHaveBeenCalledExactlyOnceWith(db, validate.mock.calls[0][0])
})

test('URL conversion preserves the body after a standalone-CR delimiter, including later dividers', async () => {
	const body = 'Body to preserve\n---\nTail'
	const source = `---\ntitle: Reviewed\ncover: '${coverUrl}'\n---\r${body}`
	const { storage, sync, event } = setup(source, assetSchema)
	mockAssetDownloads()

	expect(await actions.save(event)).toMatchObject({ success: true })
	const savedContent = storage.writeFile.mock.calls[0][1] as string
	expect(savedContent.endsWith(`---\r${body}`)).toBe(true)
	expect(sync.mock.calls[0][1].note).toBe(body)
})

test('invalid drafts do not download URLs or write source', async () => {
	const { storage, sync, event } = setup(assetDraft.replace('"Reviewed"', '42'), assetSchema)
	expect(await actions.save(event)).toMatchObject({ status: 400 })
	expect(savePieceAsset).not.toHaveBeenCalled()
	expect(storage.writeFile).not.toHaveBeenCalled()
	expect(sync).not.toHaveBeenCalled()
})

test('a failed asset download preserves the submitted draft without writing or syncing', async () => {
	const { storage, sync, event } = setup(assetDraft, assetSchema)
	vi.mocked(savePieceAsset).mockRejectedValueOnce(new Error('Download failed'))

	expect(await actions.save(event)).toMatchObject({
		status: 400,
		data: {
			rawContent: assetDraft,
			error: { message: expect.stringContaining("Failed to download asset for 'cover'") }
		}
	})
	expect(storage.writeFile).not.toHaveBeenCalled()
	expect(sync).not.toHaveBeenCalled()
})

test('index failure reports the converted source without retrying or rolling back the saved file', async () => {
	const { storage, sync, validate, event } = setup(assetDraft, assetSchema)
	mockAssetDownloads()
	sync.mockRejectedValueOnce(new Error('Index unavailable'))

	const result = await actions.save(event)
	expect(storage.writeFile).toHaveBeenCalledOnce()
	const savedContent = storage.writeFile.mock.calls[0][1] as string
	expect(result).toMatchObject({
		status: 500,
		data: {
			savedContent,
			rawContent: savedContent,
			error: { message: 'Markdown was saved, but its database index could not be updated.' }
		}
	})
	expect(storage.writeFile).toHaveBeenCalledExactlyOnceWith(file, savedContent)
	expect(sync).toHaveBeenCalledExactlyOnceWith(db, validate.mock.calls[0][0])
	expect(storage.delete).not.toHaveBeenCalled()
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
