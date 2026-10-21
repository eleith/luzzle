import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parse } from 'svelte/compiler'

test('keys both prepared and built-in content by the piece to reset fallback snapshots on navigation', () => {
	const source = readFileSync(new URL('./page.svelte', import.meta.url), 'utf8')
	const content = parse(source, { modern: true }).fragment.nodes.filter(
		(node) => node.type !== 'Text' && node.type !== 'SvelteHead'
	)
	expect(content).toHaveLength(1)
	expect(content[0]).toMatchObject({
		type: 'KeyBlock',
		expression: { type: 'Identifier', name: 'piece' }
	})
	if (content[0].type !== 'KeyBlock') throw new Error('Expected a piece-keyed content boundary')
	expect(content[0].fragment.nodes.filter((node) => node.type !== 'Text')[0]).toMatchObject({
		type: 'IfBlock'
	})
})
