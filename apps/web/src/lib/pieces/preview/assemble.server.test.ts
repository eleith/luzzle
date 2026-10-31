import { afterEach, expect, test, vi } from 'vitest'
import type { TemplateConfig as Config } from '@luzzle/web.templates/config'
import type { PreviewResult } from '@luzzle/web.jobs'
import { createPieceHelpers, type PublicWebPieceAsset } from '@luzzle/web.pieces'
import { makeConfig } from '#lib/server/config.fixture.js'
import { assemblePreview, type PreviewWorkerResult } from './assemble.server.js'
import { previewOutputUrl } from './output-url.js'

const pieceConfig: Config['pieces'][number] = {
	...makeConfig({
		pieces: [
			{
				type: 'book',
				fields: {
					title: 'details.title',
					summary: 'details.summary',
					date_consumed: 'details.read_on',
					tags: 'tags',
					media: ['media.cover', 'media.gallery[*].key'],
					attachments: ['files']
				}
			}
		]
	}).pieces[0],
	templates: {
		icon: { name: 'default', mapping: { image: 'media.cover' } },
		page: { name: 'default', mapping: { image: 'media.gallery[0].key' } },
		opengraph: { name: 'default', mapping: { image: 'media.cover' } }
	}
}

function workerResult(overrides: Partial<PreviewWorkerResult> = {}): PreviewWorkerResult {
	return {
		filePath: 'books/example.book.md',
		type: 'book',
		slug: 'example',
		pieceKey: 'piece-key',
		sanitizedFrontmatter: {
			details: { title: 'Draft title', summary: 'Draft summary', read_on: 123 },
			tags: [' Café , Sci Fi ', 'Repeat', '', 'Repeat', 'Hello / World'],
			media: {
				cover: 'cover-key',
				gallery: [{ key: 'gallery-key' }, { key: 'video-key' }, { key: 'missing-key' }, { key: '' }]
			},
			files: ['pdf-key', 'unknown-key', 'missing-key', '']
		},
		note: 'Draft **note**',
		pathToKey: {
			'archive/cover.jpg': 'cover-key',
			'archive/gallery.png': 'gallery-key',
			'archive/movie.mp4': 'video-key',
			'archive/manual.pdf': 'pdf-key',
			'archive/data.unrecognized-extension': 'unknown-key'
		},
		transforms: [],
		...overrides
	}
}

const passthroughs: PublicWebPieceAsset[] = [
	{
		asset_key: 'cover-key',
		transformation: 'image.original',
		asset_path: 'archive/cover.jpg',
		mime_type: 'image/jpeg'
	},
	{
		asset_key: 'gallery-key',
		transformation: 'image.original',
		asset_path: 'archive/gallery.png',
		mime_type: 'image/png'
	}
]

afterEach(() => vi.useRealTimers())

test('projects every actual worker record to only the public output fields', () => {
	const privateFields = {
		piece_asset_path: 'private/source.jpg',
		piece_field_path: 'media.cover',
		piece_file_path: 'private/example.book.md',
		piece_key: 'private-piece-key',
		internal_debug: 'must not be serialized'
	}
	const result = workerResult({
		transforms: [
			{
				...privateFields,
				asset_key: 'cover-key',
				transformation: 'image.thumb.webp',
				asset_path: 'preview/job/cover.webp',
				mime_type: 'image/webp',
				is_embedded: 0,
				content: ''
			},
			{
				...privateFields,
				asset_key: 'piece-key',
				transformation: 'custom.summary.html',
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: '<p>Worker content</p>'
			}
		]
	})
	const expected: PublicWebPieceAsset[] = [
		{
			asset_key: 'cover-key',
			transformation: 'image.thumb.webp',
			asset_path: 'preview/job/cover.webp',
			mime_type: 'image/webp',
			is_embedded: 0,
			content: ''
		},
		{
			asset_key: 'piece-key',
			transformation: 'custom.summary.html',
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: '<p>Worker content</p>'
		}
	]

	const assembled = assemblePreview(result, pieceConfig)

	expect(assembled.outputs).toStrictEqual(expected)
	expect(JSON.parse(JSON.stringify(assembled.outputs))).toStrictEqual(expected)
	expect(assembled.piece.assets).toStrictEqual([...expected, ...passthroughs])
	for (const output of assembled.outputs) {
		expect(Object.keys(output).sort()).toEqual(
			['asset_key', 'transformation', 'asset_path', 'mime_type', 'is_embedded', 'content'].sort()
		)
	}
})

test('keeps actual outputs first and archive image fallbacks only in piece.assets', () => {
	const output: PublicWebPieceAsset = {
		asset_key: 'cover-key',
		transformation: 'image.original',
		asset_path: 'preview/job/original.jpg',
		mime_type: 'image/jpeg',
		is_embedded: undefined,
		content: undefined
	}
	const assembled = assemblePreview(workerResult({ transforms: [output] }), pieceConfig)

	expect(assembled.outputs).toStrictEqual([output])
	expect(assembled.piece.assets).toStrictEqual([output, ...passthroughs])
	expect(assembled.outputs).not.toBe(assembled.piece.assets)
})

test('preserves duplicate actual worker records and their original ordering', () => {
	const output: PublicWebPieceAsset = {
		asset_key: 'cover-key',
		transformation: 'image.original',
		asset_path: 'preview/job/original.jpg',
		mime_type: 'image/jpeg',
		is_embedded: 0,
		content: undefined
	}
	const other = { ...output, transformation: 'custom.variant', asset_path: 'preview/job/other.jpg' }
	const transforms = [output, other, { ...output }]
	const assembled = assemblePreview(workerResult({ transforms }), pieceConfig)

	expect(assembled.outputs).toStrictEqual(transforms)
	expect(assembled.piece.assets).toStrictEqual([...transforms, ...passthroughs])
})

test.each([
	{ label: 'missing', path: {} },
	{ label: 'undefined', path: { asset_path: undefined } },
	{ label: 'null', path: { asset_path: null } }
])('normalizes $label paths to null for inline-only actual outputs', ({ path }) => {
	const inline = {
		asset_key: 'piece-key',
		transformation: 'markdown.html',
		mime_type: 'text/html',
		is_embedded: 1,
		content: '<p>Inline only</p>',
		...path
	} satisfies PublicWebPieceAsset
	const assembled = assemblePreview(workerResult({ transforms: [inline] }), pieceConfig)

	expect(assembled.outputs).toStrictEqual([{ ...inline, asset_path: null }])
	expect(assembled.piece.assets).toStrictEqual([{ ...inline, asset_path: null }, ...passthroughs])
})

test('does not fabricate attachment references for retained results without attachment outputs', () => {
	const assembled = assemblePreview(workerResult(), pieceConfig)

	expect(assembled.outputs).toStrictEqual([])
	expect(assembled.piece.assets).toStrictEqual(passthroughs)
	const helpers = createPieceHelpers(
		assembled.piece.assets,
		(path) => path,
		() => '/piece'
	)
	for (const key of ['pdf-key', 'unknown-key', 'missing-key']) {
		expect(helpers.getPieceAssetUrl(key, 'attachment')).toBeUndefined()
	}
	expect(helpers.getPieceImageUrl('cover-key', 250, 'webp')).toBe('archive/cover.jpg')
})

test('leaves the worker result and configuration unchanged', () => {
	const result = workerResult({
		transforms: [
			{
				asset_key: 'piece-key',
				transformation: 'markdown.html',
				mime_type: 'text/html',
				content: 'Inline',
				piece_asset_path: 'private/path',
				piece_field_path: 'note'
			}
		]
	})
	const originalResult = structuredClone(result)
	const originalConfig = structuredClone(pieceConfig)

	const assembled = assemblePreview(result, pieceConfig)

	expect(result).toStrictEqual(originalResult)
	expect(pieceConfig).toStrictEqual(originalConfig)
	expect(assembled.outputs[0]).not.toBe(result.transforms[0])
})

test('preserves piece metadata and the existing comma, accent, and duplicate tag normalization', () => {
	vi.setSystemTime(new Date('2026-06-22T00:00:00Z'))
	const result = workerResult()
	const assembled = assemblePreview(result, pieceConfig)

	expect(assembled.piece).toStrictEqual({
		id: 'preview',
		key: 'piece-key',
		slug: 'example',
		type: 'book',
		title: 'Draft title',
		summary: 'Draft summary',
		note: 'Draft **note**',
		keywords: JSON.stringify(['Café', 'Sci Fi', 'Repeat', 'Repeat', 'Hello / World']),
		metadata: result.sanitizedFrontmatter,
		assets: passthroughs,
		date_added: Date.now(),
		date_updated: Date.now(),
		date_consumed: 123,
		templates: {
			icon: { name: 'default', fields: { image: 'cover-key' } },
			page: { name: 'default', fields: { image: 'gallery-key' } },
			opengraph: { name: 'default', fields: { image: 'cover-key' } }
		}
	})
	expect(assembled.tags).toStrictEqual([
		{ slug: 'cafe', tag: 'Café' },
		{ slug: 'sci-fi', tag: 'Sci Fi' },
		{ slug: 'repeat', tag: 'Repeat' },
		{ slug: 'repeat', tag: 'Repeat' },
		{ slug: 'hello-world', tag: 'Hello / World' }
	])
})

test('handles missing optional fields without inventing assets or tags and retains slug fallback', () => {
	const minimalConfig: Config['pieces'][number] = makeConfig({
		pieces: [{ type: 'book', fields: { title: 'title', date_consumed: 'read_on' } }]
	}).pieces[0]
	const assembled = assemblePreview(
		workerResult({ sanitizedFrontmatter: {}, slug: '', filePath: 'Café Draft.book.md' }),
		minimalConfig
	)

	expect(assembled.outputs).toStrictEqual([])
	expect(assembled.piece.assets).toStrictEqual([])
	expect(assembled.tags).toStrictEqual([])
	expect(assembled.piece).toMatchObject({ title: '', slug: 'cafe-draftbookmd' })
	expect(assembled.piece.templates).toStrictEqual({
		icon: { name: 'default', fields: {} },
		page: { name: 'default', fields: {} },
		opengraph: { name: 'default', fields: {} }
	})
	expect(assembled.piece.summary).toBeUndefined()
	expect(assembled.piece.keywords).toBeUndefined()
	expect(assembled.piece.date_consumed).toBeUndefined()
})

test.each([
	{ tags: ' Café, Sci Fi, ', expected: ['Café', 'Sci Fi'] },
	{ tags: ['', ' , '], expected: [] }
])('keeps existing scalar and empty tag normalization for $tags', ({ tags, expected }) => {
	const assembled = assemblePreview(workerResult({ sanitizedFrontmatter: { tags } }), pieceConfig)

	expect(assembled.tags.map(({ tag }) => tag)).toStrictEqual(expected)
	expect(assembled.piece.keywords).toBe(expected.length ? JSON.stringify(expected) : undefined)
})

test('exposes generated attachment downloads and prioritizes generated images over archive fallbacks', () => {
	const attachments: PublicWebPieceAsset[] = [
		{
			asset_key: 'pdf-key',
			transformation: 'attachment',
			asset_path: 'book/piece-key/manual.pdf',
			mime_type: 'application/pdf'
		},
		{
			asset_key: 'unknown-key',
			transformation: 'attachment',
			asset_path: 'book/piece-key/data.unrecognized-extension',
			mime_type: 'application/octet-stream'
		}
	]
	const image: PublicWebPieceAsset = {
		asset_key: 'cover-key',
		transformation: 'image.original',
		asset_path: 'book/piece-key/cover.jpg',
		mime_type: 'image/jpeg'
	}
	// Exercise the persisted shared worker contract, not archive-path stand-ins.
	const result: PreviewResult = JSON.parse(
		JSON.stringify(
			workerResult({
				transforms: [...attachments, image]
			})
		)
	)
	const assembled = assemblePreview(result, pieceConfig)
	const helpers = createPieceHelpers(
		assembled.piece.assets,
		(path) => previewOutputUrl(path, 'preview-job')!,
		() => '/piece'
	)

	expect(assembled.outputs.map((asset) => asset.asset_path)).toEqual([
		'book/piece-key/manual.pdf',
		'book/piece-key/data.unrecognized-extension',
		'book/piece-key/cover.jpg'
	])
	expect(
		assembled.piece.assets.filter((asset) => asset.transformation === 'attachment')
	).toStrictEqual(assembled.outputs.filter((asset) => asset.transformation === 'attachment'))
	expect(helpers.getPieceAssetUrl('pdf-key', 'attachment')).toBe(
		'/admin/preview/preview-job/asset/book/piece-key/manual.pdf'
	)
	expect(helpers.getPieceAssetUrl('unknown-key', 'attachment')).toBe(
		'/admin/preview/preview-job/asset/book/piece-key/data.unrecognized-extension'
	)
	expect(helpers.getPieceAssetUrl('missing-key', 'attachment')).toBeUndefined()
	expect(helpers.getPieceAssetUrl('cover-key', 'image.original')).toBe(
		'/admin/preview/preview-job/asset/book/piece-key/cover.jpg'
	)
	expect(helpers.getPieceImageUrl('cover-key', 250, 'webp')).toBe(
		'/admin/preview/preview-job/asset/book/piece-key/cover.jpg'
	)
	expect(helpers.getPieceImageUrl('gallery-key', 250, 'webp')).toBe(
		'/admin/preview/preview-job/asset/archive/gallery.png'
	)
})
