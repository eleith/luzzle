import { render } from 'svelte/server'
import { expect, test, vi } from 'vitest'
import DefaultIcon from '@luzzle/web.templates/icons/default'
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import IconListing from './IconListing.svelte'

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
		css: '.example > b::after { content: "</StYlE><meta name=breakout>" }'
	}
	const { head, body } = render(IconListing, {
		props: { data: { ...data, externalIcons }, Icon: DefaultIcon }
	})
	expect(body).toMatch(
		/<a href="\/fixture">external first<\/a>[\s\S]*?poster-title[^>]*>second<[\s\S]*?<b>external third<\/b>/
	)
	expect(body).toContain('<div><!----><a href="/fixture">external first</a></div>')
	expect(body.match(/class="external-icon"/g)).toHaveLength(2)
	expect(head.match(/\.example > b/g)).toHaveLength(1)
	expect(head).not.toMatch(/<\/style><meta/i)
	expect(body).not.toContain('.example > b')
})

test('keeps the named route built-in when no external design was loaded', () => {
	const { body } = render(IconListing, { props: { data, Icon: DefaultIcon } })
	expect(body.match(/poster-title/g)).toHaveLength(3)
	expect(body).not.toContain('class="external-icon"')
})
