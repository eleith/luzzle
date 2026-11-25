import { expect, test, vi } from 'vitest'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import { config } from '#lib/server/config.js'
import { loadPublishedIcon } from '#lib/server/templates/icon.js'
import { renderPieceIcons } from './render.server.js'

vi.mock('#lib/server/config.js', () => ({ config: {} }))
vi.mock('#lib/server/templates/icon.js', () => ({ loadPublishedIcon: vi.fn() }))

test('mixed icons load once per type, preserve fallback slots and share stylesheets', async ({
	onTestFinished
}) => {
	const cause = new Error('invalid icon data')
	const log = vi.spyOn(console, 'error').mockImplementation(() => {})
	onTestFinished(() => log.mockRestore())
	const pieces = ['books', 'notes', 'albums', 'films', 'books', 'books'].map((type, i) => ({
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
					render: (piece, { lazy }) => {
						if (piece.slug === 'row-4') throw cause
						return `${type}:${piece.slug}${lazy ? ':lazy' : ''}`
					}
				})
	)
	const rows = pieces.map((piece, index) => ({ piece, size: { width: 90 }, lazy: index === 2 }))
	expect(await renderPieceIcons(rows, config)).toEqual({
		html: ['books:row-0', null, 'albums:row-2:lazy', 'films:row-3', null, 'books:row-5'],
		stylesheets: [css, filmCss]
	})
	expect(log).toHaveBeenCalledExactlyOnceWith('Cannot render listing icon for books/row-4', cause)
	expect(vi.mocked(loadPublishedIcon).mock.calls.map(([type]) => type)).toEqual([
		'books',
		'notes',
		'albums',
		'films'
	])
})
