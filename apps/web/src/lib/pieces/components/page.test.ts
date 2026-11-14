import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import { createPieceHelpers, type PublicWebPiece } from '@luzzle/web.pieces'
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields'
import Page from './page.svelte'

vi.mock('$app/state', () => ({ navigating: { to: null } }))
vi.mock('$app/paths', () => ({ resolve: (route: string) => `/${route}` }))
vi.mock('#lib/pieces/helpers.js', () => ({
	getPieceHelpers: (piece: PublicWebPiece) =>
		createPieceHelpers(
			piece.assets,
			(path) => `/assets/${path}`,
			() => '/pieces/words/example'
		)
}))

test('note keeps theme-colored navigation and random access even when an image palette exists', () => {
	const source: PublicWebPiece = {
		id: 'example',
		key: 'example',
		type: 'words',
		slug: 'example',
		title: 'Example',
		date_added: 1,
		note: 'A note',
		metadata: {},
		assets: [
			{
				asset_key: 'cover',
				transformation: 'palette',
				mime_type: 'application/json',
				content: '{"background":"#123456","bodyText":"#abcdef","accent":"#654321"}'
			}
		]
	}
	const piece = mapPieceTemplates(source, {
		type: source.type,
		fields: { title: 'title', date_consumed: 'date_published' },
		templates: {
			icon: { name: 'default' },
			page: { name: 'note' },
			opengraph: { name: 'default' }
		}
	})

	const body = render(Page, { props: { piece, tags: [] } }).body

	expect(body.match(/aria-label="Global"/g)).toHaveLength(1)
	expect(body).toContain('--banner-background-color: transparent;')
	expect(body).toContain('--banner-text-color: var(--color-on-surface);')
	expect(body).toContain('--banner-hover-color: var(--color-primary);')
	expect(body).toContain('aria-label="random"')
})
