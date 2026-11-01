import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import { makeConfig } from '#lib/server/config.fixture.js'
import Page from './+page.svelte'

const { resolve } = vi.hoisted(() => ({
	resolve: vi.fn((route: string, params?: { path: string }) => {
		const path = route.replace('/(auth)', '').replace('[...path]', () => params?.path ?? '')
		return path.startsWith('/') ? path : `/${path}`
	})
}))
vi.mock('$app/paths', () => ({ resolve }))

// Mocked SSR proves native route params, encoded application paths and rendered
// targets, not native Kit resolution or browser navigation.
test('directory links encode segments once and retain nested separators and trailing slash', () => {
	const props = {
		data: {
			config: makeConfig(),
			meta: { title: 'Directory' },
			pieceTypes: ['books'],
			directory: { parent: '棚 #?%', current: '棚 #?%/literal%2F' },
			files: {
				pieces: [
					{
						file: '棚 #?%/literal%2F/源 #?%.books.md',
						slug: 'Piece',
						type: 'books',
						format: '.md'
					}
				],
				assets: [{ path: '棚 #?%/literal%2F/.assets/源 #?%.png', name: 'Asset' }],
				directories: [{ path: '棚 #?%/literal%2F/子 #?%/', name: 'Directory' }]
			}
		}
	} satisfies ComponentProps<typeof Page>
	const targets = [
		'admin/piece/%E6%A3%9A%20%23%3F%25/literal%252F/%E6%BA%90%20%23%3F%25.books.md/source',
		'admin/asset/editor/%E6%A3%9A%20%23%3F%25/literal%252F/.assets/%E6%BA%90%20%23%3F%25.png',
		'admin/directory/%E6%A3%9A%20%23%3F%25/literal%252F/%E5%AD%90%20%23%3F%25/'
	]
	const html = render(Page, { props }).body.replace(/<!--[^]*?-->/g, '')
	const links = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? []
	expect(links).toHaveLength(3)
	for (const [index, label] of ['Piece', 'Asset', 'Directory'].entries()) {
		expect(links[index]).toContain(`href="/${targets[index]}"`)
		expect(links[index]).toContain(`>${label}</a>`)
	}
	// Native piece params and asset/directory pathstrings are already encoded;
	// separators and the directory's final slash are left intact.
	expect(resolve.mock.calls).toEqual([
		[
			'/(auth)/admin/piece/[...path]/source',
			{
				path: '%E6%A3%9A%20%23%3F%25/literal%252F/%E6%BA%90%20%23%3F%25.books.md'
			}
		],
		[targets[1]],
		[targets[2]]
	])
})
