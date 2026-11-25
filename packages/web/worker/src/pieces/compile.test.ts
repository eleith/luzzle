import { test, expect } from 'vitest'
import { render } from 'svelte/server'
import { createPieceHelpers } from '@luzzle/web.pieces'
import { getDefaultOpengraphModule } from './compile.js'

const piece = {
	id: 'example',
	key: 'example',
	title: 'A poster record',
	type: 'arbitrary',
	slug: 'example',
	date_added: 1,
	metadata: {},
	assets: [],
}

const helpers = createPieceHelpers([], (path) => path, () => '/piece')

test('renders fields mapped into the default template', async () => {
	const component = await getDefaultOpengraphModule()
	const rendered = render(component.default, {
		props: { piece, fields: { director: 'Ada', dateReleased: '2024-01-01', runtime: 90 }, helpers },
	})
	expect(rendered.body).toContain('by Ada')
	expect(rendered.body).toContain('2024 · 90 min')
})
