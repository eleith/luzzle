import { expect, test, vi } from 'vitest'
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import { loadPieceListing } from '#lib/server/load/pieces.js'
import { loadPublishedIcon } from '#lib/server/templates/icon.js'
import { load } from './+layout.server'

vi.mock('#lib/server/config.js', () => ({ config: {} }))
vi.mock('#lib/server/load/pieces.js', () => ({ loadPieceListing: vi.fn() }))
vi.mock('#lib/server/templates/icon.js', () => ({ loadPublishedIcon: vi.fn() }))

test('a failed icon leaves a fallback slot without shifting the following piece’s markup', async ({
	onTestFinished
}) => {
	const pieces = ['first', 'broken', 'last'].map((slug) =>
		mapPieceTemplates({ ...publishedPiece, id: slug, slug })
	)
	const listing = { pieces, page: 1, nextPage: null, year: null }
	vi.mocked(loadPieceListing).mockResolvedValue(listing)
	const cause = new Error('invalid icon data')
	const css = 'b { color: blue }'
	vi.mocked(loadPublishedIcon).mockResolvedValue({
		css,
		render({ slug }) {
			if (slug === 'broken') throw cause
			return `<b>${slug}</b>`
		}
	})
	const log = vi.spyOn(console, 'error').mockImplementation(() => {})
	onTestFinished(() => log.mockRestore())

	const result = await load({
		params: { piece: 'books' },
		url: new URL('https://example.test/pieces/books')
	} as Parameters<typeof load>[0])

	expect(result).toEqual({
		...listing,
		externalIcons: { css, html: ['<b>first</b>', null, '<b>last</b>'] }
	})
	expect(log).toHaveBeenCalledExactlyOnceWith('Cannot render listing icon for books/broken', cause)
})
