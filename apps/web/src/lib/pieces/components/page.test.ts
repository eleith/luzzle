import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parse } from 'svelte/compiler'

test.each([
	{ role: 'icon', component: 'Icon', getter: 'getIcon', catalog: 'icons' },
	{ role: 'page', component: 'Page', getter: 'getPage', catalog: 'pages' },
	{ role: 'opengraph', component: 'Opengraph', getter: 'getOpengraph', catalog: 'opengraphs' }
])(
	'$role uses reactive props and the shared static catalog, not prepared HTML or async dispatch',
	({ role, component, getter, catalog }) => {
		const source = readFileSync(new URL(`./${role}.svelte`, import.meta.url), 'utf8')
		expect(source).toContain(`from '@luzzle/web.templates/${catalog}'`)
		expect(source).toContain(`const ${component} = $derived(${getter}(`)
		expect(source).toContain('const fields = $derived(')
		expect(source).toContain('const helpers = $derived(getPieceHelpers(piece))')
		expect(source).toContain(`<${component} {piece} {fields}`)
		expect(source).not.toMatch(
			/import\.meta\.glob|\bimport\s*\(|\{@html|\{#(?:await|key|if)\b|presentation|prepared/i
		)
		const content = parse(source, { modern: true }).fragment.nodes.filter(
			(node) => node.type !== 'Text' && node.type !== 'SvelteHead'
		)
		expect(content.length).toBeGreaterThan(0)
		for (const node of content) {
			expect(['Component', 'RegularElement']).toContain(node.type)
		}
	}
)
