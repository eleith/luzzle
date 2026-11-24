import { test, expect } from 'vitest'
import { render } from 'svelte/server'
import { createPieceHelpers } from '@luzzle/web.pieces'
import { getCompiledOpengraphModule } from './compile.js'
import { templates } from '@luzzle/web.templates/opengraphs/schema'

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
	const first = await getCompiledOpengraphModule('default')
	const rendered = render(first.default, {
		props: { piece, fields: { director: 'Ada', dateReleased: '2024-01-01', runtime: 90 }, helpers },
	})
	expect(rendered.body).toContain('by Ada')
	expect(rendered.body).toContain('2024 · 90 min')
})

test.each(templates.map((template) => template.name))(
	'compiles and caches the shipped %s source by catalog name',
	async (name) => {
		const first = await getCompiledOpengraphModule(name)
		expect(await getCompiledOpengraphModule(name)).toBe(first)
		const result = render(first.default, { props: { piece, fields: {}, helpers } })
		expect(result.body).toContain('A poster record')
		expect(result.head).toContain('<style')
	}
)

test('book title and author styles bound long words within the fixed card', async () => {
	const module = await getCompiledOpengraphModule('book')
	const long = 'Unbroken'.repeat(150)
	const result = render(module.default, {
		props: { piece: { ...piece, title: long }, fields: { author: long }, helpers },
	})
	expect(result.body).toContain(long)
	expect(result.head).toMatch(/max-height:\s*360px/)
	expect(result.head).toMatch(/overflow-wrap:\s*anywhere/)
	expect(result.head).toMatch(/-webkit-line-clamp:\s*6/)
	expect(result.head).toMatch(/-webkit-line-clamp:\s*2/)
})

test.each([
	['browser-window', 'right-panel', 'author'],
	['poster', 'left-panel', 'director'],
	['recipe-card', 'left-panel', 'source'],
	['vinyl-record', 'left-panel', 'artist'],
])('%s keeps unbroken headings within a shrinkable text panel', async (name, panel, credit) => {
	const module = await getCompiledOpengraphModule(name)
	const long = 'Unbroken'.repeat(150)
	const result = render(module.default, {
		props: { piece: { ...piece, title: long }, fields: { [credit]: long }, helpers },
	})
	expect(result.body).toContain(long)
	expect(result.head).toMatch(new RegExp(`\\.${panel}[^{}]*\\{[^}]*min-width:\\s*0`))
	for (const heading of ['h1', 'h2']) {
		const rule = result.head.match(
			new RegExp(`\\.${panel}[^{}]*[\\s>]${heading}\\b[^{}]*\\{([^}]+)`)
		)?.[1]
		expect(rule).toMatch(/max-width:\s*100%/)
		expect(rule).toMatch(/overflow-wrap:\s*anywhere/)
	}
})

test.each([
	['https://www.example.com/story', undefined, 'example · 3 min'],
	['not a URL', undefined, '3 min'],
	['https://averylonghostnamethatisnotabyline.example/story', undefined, '3 min'],
	['https://www.example.com/story', 'Ada', '3 min'],
])('browser byline handles hostname %s and author %s', async (url, author, expected) => {
	const module = await getCompiledOpengraphModule('browser-window')
	const result = render(module.default, {
		props: { piece, fields: { url, author, wordCount: 750 }, helpers },
	})
	const byline = result.body.match(/<p class="byline[^"]*">([\s\S]*?)<\/p>/)?.[1]
	expect(byline).toBe(expected)
})

test('unknown names do not become arbitrary source paths', async () => {
	await expect(getCompiledOpengraphModule('../../owned.svelte')).rejects.toThrow(
		'Unknown opengraph template'
	)
})
