import { expect, test, vi } from 'vitest'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import { config } from '#lib/server/config.js'
import { loadPublishedIcon } from '#lib/server/templates/icon.js'
import { renderIconListing } from './render.server.js'

vi.mock('#lib/server/config.js', () => ({ config: {} }))
vi.mock('#lib/server/templates/icon.js', () => ({ loadPublishedIcon: vi.fn() }))

test('a mixed page loads designs per type, preserves row order and includes shared CSS only once', async () => {
	const pieces = ['books', 'notes', 'albums', 'films', 'books'].map((type, i) => ({
		...publishedPiece,
		type,
		slug: `row-${i}`
	}))
	const css = '.cover { color: teal }'
	const filmCss = '@import url("/film-font.css"); .film { color: red }'
	vi.mocked(loadPublishedIcon).mockImplementation((type) =>
		type === 'notes'
			? undefined
			: Promise.resolve({
					css: type === 'films' ? filmCss : css,
					render: (piece) => `${type}:${piece.slug}`
				})
	)
	expect(await renderIconListing(pieces, config)).toEqual({
		html: ['books:row-0', null, 'albums:row-2', 'films:row-3', 'books:row-4'],
		stylesheets: [css, filmCss]
	})
	expect(vi.mocked(loadPublishedIcon).mock.calls.map(([type]) => type)).toEqual([
		'books',
		'notes',
		'albums',
		'films'
	])
})
