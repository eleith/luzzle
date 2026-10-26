import { SvelteKitAuth } from '@auth/sveltekit'
import Credentials from '@auth/core/providers/credentials'
import type { Provider } from '@auth/core/providers'
import type { AppConfig } from './config'

export function createAuthentication(auth: AppConfig['auth'], appAssets: string) {
	if (!auth) return undefined
	const providers: Provider[] = []

	if ('oidc' in auth) {
		providers.push({
			id: 'oidc',
			name: auth.oidc.name,
			type: 'oidc',
			issuer: auth.oidc.issuer,
			clientId: auth.oidc.clientId,
			clientSecret: auth.oidc.clientSecret,
			checks: ['state'],
			style: {
				logo: `${appAssets}/images/favicon.png`
			}
		})
	}

	if ('credentials' in auth) {
		const user = auth.credentials
		providers.push(
			Credentials({
				credentials: {
					username: { label: 'Username', type: 'text' },
					password: { label: 'Password', type: 'password' }
				},
				async authorize(credentials) {
					if (user.username === credentials?.username && user.password === credentials?.password) {
						return {
							id: user.username,
							name: user.username,
							email: `${user.username}@luzzle.local`
						}
					}

					return null
				}
			})
		)
	}

	return SvelteKitAuth({
		trustHost: true,
		secret: auth.secret,
		pages: {
			signIn: '/signin'
		},
		providers
	})
}
