import { readFileSync } from 'node:fs'
import { parse } from 'svelte/compiler'
import { afterAll, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import Signin from './+page.svelte'

vi.mock('$app/navigation', () => ({ goto: vi.fn() }))
// Import the real client during SSR without consulting ambient auth URL settings.
vi.hoisted(() => vi.stubEnv('BETTER_AUTH_URL', 'not-a-url'))
afterAll(() => vi.unstubAllEnvs())

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

test.each(['credentials', 'oidc'])(
	'SSR with an invalid ambient auth URL renders an accessible callback failure for %s',
	(authType) => {
		const { body } = render(Signin, {
			props: {
				data: { redirectTo: '/admin', authType, oidcName: 'Our SSO', errorCode: 'AuthError' }
			} as never
		})
		expect(body).toContain('role="alert"')
		expect(body).toContain('Unable to sign in. Please try again.')
		if (authType === 'credentials') {
			expect(body).toContain('autocomplete="username"')
			expect(body).toContain('autocomplete="current-password"')
		} else {
			expect(body).toContain('Our SSO')
		}
	}
)
