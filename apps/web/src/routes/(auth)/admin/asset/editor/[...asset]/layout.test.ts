import { readFileSync } from 'node:fs'
import { parse } from 'svelte/compiler'
import { expect, test } from 'vitest'

// Structural ownership guard, not proof of client remount or editor teardown.
test('the entire asset editor is keyed by path, not refreshed loader data', () => {
	const source = readFileSync(new URL('./+layout.svelte', import.meta.url), 'utf8')
	const nodes = parse(source, { modern: true }).fragment.nodes.filter(
		(node) => node.type !== 'Text'
	)
	expect(nodes).toHaveLength(1)
	const boundary = nodes[0]
	if (boundary.type !== 'KeyBlock') throw new Error('Asset editor must have an identity key')
	expect(boundary.expression).toMatchObject({
		type: 'MemberExpression',
		object: { type: 'Identifier', name: 'params' },
		property: { type: 'Identifier', name: 'asset' }
	})
	expect(boundary.fragment.nodes.filter((node) => node.type !== 'Text')).toMatchObject([
		{ type: 'RenderTag', expression: { callee: { type: 'Identifier', name: 'children' } } }
	])
})
