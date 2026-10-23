import { test, expect } from 'vitest'
import { render } from 'svelte/server'
import { createPieceHelpers } from '@luzzle/web.pieces'
import { getCompiledOpengraphModule } from './compile.js'

const piece = {
	id: 'example', key: 'example', title: 'A poster record', type: 'arbitrary', slug: 'example',
	date_added: 1, metadata: {}, assets: []
}

test('compiles the shipped default once and reuses its module', async () => {
	const first = await getCompiledOpengraphModule('default')
	const second = await getCompiledOpengraphModule('default')
	expect(first).toBe(second)
	const helpers = createPieceHelpers([], (path) => '/pieces/assets/' + path, () => '/pieces/arbitrary/example')
	const rendered = render(first.default, {
		props: { piece, fields: { director: 'Ada', dateReleased: '2024-01-01', runtime: 90 }, helpers }
	})
	expect(rendered.body).toContain('A poster record')
	expect(rendered.body).toContain('by Ada')
	expect(rendered.body).toContain('2024 · 90 min')
	expect(rendered.head).toContain('<style')
})

test('unknown names do not become arbitrary source paths', async () => {
	await expect(getCompiledOpengraphModule('../../owned.svelte')).rejects.toThrow('Unknown opengraph template')
})
