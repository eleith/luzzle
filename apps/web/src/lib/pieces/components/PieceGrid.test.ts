import { render } from 'svelte/server'
import { expect, test, vi } from 'vitest'
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import PieceGrid from './PieceGrid.svelte'

vi.mock('$app/navigation', () => ({ afterNavigate: () => {} }))
vi.mock('$app/paths', () => ({ resolve: (path: string) => `/${path}` }))
vi.mock('$app/state', () => ({
	page: { params: { piece: 'books' }, data: { config: { url: { app: 'https://app.test' } } } }
}))

const pieces = ['first', 'second', 'third'].map((id) =>
	mapPieceTemplates({ ...publishedPiece, id, slug: id, title: id })
)
const data = { pieces, page: 1, nextPage: null, year: null }

test('renders external fragments in row order, using the built-in icon for a failed row', () => {
	const externalIcons = {
		html: ['<!----><a href="/fixture">external first</a>', null, '<b>external third</b>'],
		stylesheets: [
			'.example > b::after { content: "</StYlE><meta name=breakout>" }',
			'@import url("/icon-font.css");'
		]
	}
	const { head, body } = render(PieceGrid, {
		props: { data: { ...data, externalIcons } }
	})
	expect(body).toMatch(
		/<a href="\/fixture">external first<\/a>[\s\S]*?poster-title[^>]*>second<[\s\S]*?<b>external third<\/b>/
	)
	expect(head.match(/\.example > b/g)).toHaveLength(1)
	expect(head).toContain('<style>@import url("/icon-font.css");</style>')
	expect(head).not.toMatch(/<\/style><meta/i)
	expect(body).not.toContain('.example > b')
})
