import { beforeEach, expect, test, vi } from 'vitest'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { getPieceHelpers } from './helpers.js'

const { page } = vi.hoisted(() => ({
	page: {
		params: {} as { jobId?: string },
		url: new URL('https://app.example/pieces/books/book'),
		data: {
			preview: undefined as boolean | undefined,
			job: undefined as string | undefined,
			config: { url: { app: 'https://app.example', luzzle_assets: '' } }
		}
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string>) =>
		route.replace(/\[(?:\.\.\.)?(\w+)\]/g, (_, name: string) => params[name])
}))

function piece(path = 'books/cover key/cover.jpg'): PublicWebPiece {
	return {
		id: 'book',
		key: 'book-key',
		title: 'Book',
		slug: 'a book',
		type: 'books',
		date_added: 1,
		metadata: {},
		keywords: '[]',
		assets: [
			{
				asset_key: 'cover',
				transformation: 'image.original',
				asset_path: path,
				mime_type: 'image/jpeg'
			},
			{
				asset_key: 'cover',
				transformation: 'palette',
				content: '{"accent":"blue"}',
				mime_type: 'application/json'
			}
		]
	}
}

beforeEach(() => {
	page.url = new URL('https://app.example/pieces/books/book')
	page.params = {}
	page.data.preview = undefined
	page.data.job = undefined
	page.data.config.url = { app: 'https://app.example', luzzle_assets: '' }
})

test.each([undefined, false, true])(
	'custom-piece helpers keep the same interface when preview is %j',
	(preview) => {
		page.data.preview = preview
		page.data.job = preview ? 'job' : undefined
		const data = piece()
		data.assets.push({
			asset_key: 'book-key',
			transformation: 'markdown',
			content: 'Rendered body',
			mime_type: 'text/markdown'
		})
		const helpers = getPieceHelpers(data)
		expect(helpers.getPieceImageUrl('cover', 500, 'jpg')).toBe(
			helpers.getPieceAssetUrl('cover', 'image.original')
		)
		expect(helpers.getPieceAssetContent('book-key', 'markdown')).toBe('Rendered body')
		expect(helpers.getPiecePalette()).toEqual({ accent: 'blue' })
		expect(helpers.getPieceUrl()).toBe('https://app.example/pieces/books/a%20book')
	}
)

test.each([undefined, false])(
	'preview %j uses Published assets with encoded links and app fallback',
	(preview) => {
		page.data.preview = preview
		const helpers = getPieceHelpers(piece())
		expect(helpers.getPieceImageUrl('cover', 500, 'jpg')).toBe(
			'https://app.example/pieces/assets/books/cover%20key/cover.jpg'
		)
		expect(helpers.getPieceUrl()).toBe('https://app.example/pieces/books/a%20book')
		expect(helpers.getPiecePalette()).toEqual({ accent: 'blue' })
	}
)

test('Published is the default even on an admin pathname', () => {
	page.url = new URL('https://app.example/admin/piece/book.books.md/published')
	page.data.config.url.luzzle_assets = 'https://cdn.example/prefix/'
	expect(getPieceHelpers(piece()).getPieceAssetUrl('cover', 'image.original')).toBe(
		'https://cdn.example/prefix/pieces/assets/books/cover%20key/cover.jpg'
	)
})

test('Preview uses its declared job, not the current route parameter', () => {
	page.params.jobId = 'unrelated-route-job'
	page.data.preview = true
	page.data.job = 'selected job'
	expect(getPieceHelpers(piece()).getPieceAssetUrl('cover', 'image.original')).toBe(
		'/admin/preview/selected%20job/asset/books/cover%20key/cover.jpg'
	)
})

test.each([undefined, ''])('Preview requires a nonempty job, received %j', (job) => {
	page.data.preview = true
	page.data.job = job
	expect(() => getPieceHelpers(piece())).toThrow('Preview rendering requires a job.')
})

test.each([undefined, false])(
	'a job by itself does not enable Preview when preview is %j',
	(preview) => {
		page.data.preview = preview
		page.data.job = 'unrelated-job'
		expect(getPieceHelpers(piece()).getPieceAssetUrl('cover', 'image.original')).toBe(
			'https://app.example/pieces/assets/books/cover%20key/cover.jpg'
		)
	}
)

test('clearing Preview data returns to Published without changing an existing helper', () => {
	page.data.preview = true
	page.data.job = 'job'
	const preview = getPieceHelpers(piece())
	page.data.preview = undefined
	page.data.job = undefined
	const normal = getPieceHelpers(piece())
	expect(preview.getPieceAssetUrl('cover', 'image.original')).toContain('/admin/preview/job/asset/')
	expect(normal.getPieceAssetUrl('cover', 'image.original')).toBe(
		'https://app.example/pieces/assets/books/cover%20key/cover.jpg'
	)
})

test('a preview pathname cannot change the Published default without an explicit flag', () => {
	page.url = new URL('https://app.example/admin/piece/book.books.md/preview/job/share')
	page.params.jobId = 'job'
	expect(getPieceHelpers(piece()).getPieceAssetUrl('cover', 'image.original')).toBe(
		'https://app.example/pieces/assets/books/cover%20key/cover.jpg'
	)
})

test.each([
	'../private.jpg',
	'books/../private.jpg',
	'/private.jpg',
	'books//cover.jpg',
	'books/./cover.jpg',
	'books\\cover.jpg',
	'https://other.example/cover.jpg',
	'   '
])('invalid published path %j has no URL while keeping inline content and input intact', (path) => {
	const source = piece(path)
	const helpers = getPieceHelpers(source)
	expect(helpers.getPieceAssetUrl('cover', 'image.original')).toBeUndefined()
	expect(helpers.getPieceImageUrl('cover', 500, 'jpg')).toBeUndefined()
	expect(helpers.getPiecePalette()).toEqual({ accent: 'blue' })
	expect(source.assets[0].asset_path).toBe(path)
})

test('invalid published variants fall back to an available original', () => {
	const source = piece('original.jpg')
	source.assets.push({
		asset_key: 'cover',
		transformation: 'image.l.jpg',
		asset_path: '../private.jpg',
		mime_type: 'image/jpeg'
	})
	expect(getPieceHelpers(source).getPieceImageUrl('cover', 500, 'jpg')).toBe(
		'https://app.example/pieces/assets/original.jpg'
	)
})

test('published links encode raw Unicode, query, fragment and percent filename characters', () => {
	expect(
		getPieceHelpers(piece('books/雪 ?#%.jpg')).getPieceAssetUrl('cover', 'image.original')
	).toBe('https://app.example/pieces/assets/books/%E9%9B%AA%20%3F%23%25.jpg')
})

test('app and CDN prefixes do not duplicate trailing slashes', () => {
	page.data.config.url.app = 'https://app.example/site/'
	const helpers = getPieceHelpers(piece())
	expect(helpers.getPieceUrl()).toBe('https://app.example/site/pieces/books/a%20book')
	expect(helpers.getPieceAssetUrl('cover', 'image.original')).toBe(
		'https://app.example/site/pieces/assets/books/cover%20key/cover.jpg'
	)
})

test('new helpers follow replacement piece, preview, config and job data', () => {
	page.data.preview = true
	page.data.job = 'old'
	const old = getPieceHelpers(piece('old.jpg'))
	page.data.job = 'new'
	const next = getPieceHelpers({ ...piece('new.jpg'), slug: 'new-book' })
	expect(old.getPieceAssetUrl('cover', 'image.original')).toBe('/admin/preview/old/asset/old.jpg')
	expect(next.getPieceAssetUrl('cover', 'image.original')).toBe('/admin/preview/new/asset/new.jpg')
	expect(next.getPieceUrl()).toBe('https://app.example/pieces/books/new-book')
	page.data.preview = false
	page.data.config.url.luzzle_assets = '/cdn'
	expect(getPieceHelpers(piece()).getPieceAssetUrl('cover', 'image.original')).toBe(
		'/cdn/pieces/assets/books/cover%20key/cover.jpg'
	)
})
