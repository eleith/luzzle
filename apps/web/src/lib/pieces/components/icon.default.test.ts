import { describe, expect, test } from 'vitest'
import { render } from 'svelte/server'
import { createPieceHelpers, type PublicWebPiece } from '@luzzle/web.pieces'
import { getIcon } from '@luzzle/web.templates/icons'

const IconDefault = getIcon('default')

const piece: PublicWebPiece = {
	id: 'default-icon',
	key: 'default-icon',
	type: 'arbitrary-kind',
	slug: 'default-icon',
	title: '<Default>&',
	date_added: 1,
	metadata: { cover: 'cover' },
	keywords: '[]',
	assets: [
		{
			asset_key: 'cover',
			transformation: 'image.original',
			asset_path: 'cover.jpg',
			mime_type: 'image/jpeg'
		}
	]
}
const helpers = createPieceHelpers(
	piece.assets,
	(path) => `/assets/${path}`,
	() => '/piece'
)

describe('shipped static default icon', () => {
	test('renders the poster UI with mapped fields and piece helpers and the default aspect ratio', () => {
		const { body } = render(IconDefault, {
			props: { piece, fields: { image: 'cover' }, size: { width: 80 }, active: false, helpers }
		})
		expect(body).toContain('class="poster')
		expect(body).toContain('&lt;Default>&amp;')
		expect(body).toContain('--piece-icon-height: 120px;')
		expect(body).toContain('src="/assets/cover.jpg" loading="eager"')
	})

	test('honors explicit height, lazy loading and active styling', () => {
		const { body } = render(IconDefault, {
			props: {
				piece,
				fields: { image: 'cover' },
				size: { width: 80, height: 55 },
				lazy: true,
				active: true,
				helpers
			}
		})
		expect(body).toContain('--piece-icon-height: 55px;')
		expect(body).toMatch(/class="poster [^"]*\bactive\b/)
		expect(body).toContain('loading="lazy" fetchpriority="auto"')
	})
})
