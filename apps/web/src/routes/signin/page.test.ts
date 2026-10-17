import { readFileSync } from 'node:fs'
import { parse } from 'svelte/compiler'
import { expect, test } from 'vitest'

const source = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8')

// Structural guards: SSR cannot exercise clicks or client-side navigation.
test('the client destination reacts to validated page data, not raw query parameters', () => {
	const statements = parse(source, { modern: true }).instance?.content.body ?? []
	const declaration = statements
		.flatMap((statement) =>
			statement.type === 'VariableDeclaration' ? statement.declarations : []
		)
		.find(
			(declaration) => declaration.id.type === 'Identifier' && declaration.id.name === 'redirectTo'
		)

	expect(declaration).toMatchObject({
		init: {
			type: 'CallExpression',
			callee: { type: 'Identifier', name: '$derived' },
			arguments: [
				{
					type: 'MemberExpression',
					object: { type: 'Identifier', name: 'data' },
					property: { type: 'Identifier', name: 'redirectTo' }
				}
			]
		}
	})
	expect(source).not.toContain('searchParams')
})

test('credentials and OIDC callbacks and credentials navigation use that destination', () => {
	expect(source.match(/\bcallbackUrl:\s*redirectTo\b/g)).toHaveLength(2)
	expect(source).toContain('goto(redirectTo)')
})
