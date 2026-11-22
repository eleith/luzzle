import { expect, test, vi } from 'vitest'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { createRenderHelpers } from './render.js'

vi.mock('$app/state', () => {
	throw new Error('Server render helpers must not depend on SvelteKit page state.')
})

test('the same piece can render with independent published and preview contexts', () => {
	const source: PublicWebPiece = {
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
				asset_path: 'books/cover.jpg',
				mime_type: 'image/jpeg'
			}
		]
	}
	const appUrl = 'https://public.example/'
	const published = createRenderHelpers(source, {
		mode: 'published',
		appUrl,
		assetBaseUrl: 'https://cdn.example'
	})
	const preview = createRenderHelpers(source, { mode: 'preview', appUrl, job: 'job 2' })
	expect(preview.getPieceAssetUrl('cover', 'image.original')).toBe(
		'/admin/preview/job%202/asset/books/cover.jpg'
	)
	expect(published.getPieceAssetUrl('cover', 'image.original')).toBe(
		'https://cdn.example/pieces/assets/books/cover.jpg'
	)
	expect(preview.getPieceUrl()).toBe('https://public.example/pieces/books/a%20book')
})
