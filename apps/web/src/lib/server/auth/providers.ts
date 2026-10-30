import { timingSafeEqual } from 'node:crypto'
import type { Config } from '@luzzle/web.config'
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth'
import { APIError, createAuthEndpoint, formCsrfMiddleware } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import { genericOAuth } from 'better-auth/plugins/generic-oauth'

type AuthConfig = NonNullable<Config['auth']>
type Credentials = Extract<AuthConfig, { credentials: unknown }>['credentials']
type AuthOptions = Pick<BetterAuthOptions, 'plugins' | 'onAPIError'>

export function buildAuthOptions(auth: AuthConfig, baseURL: string): AuthOptions {
	if ('credentials' in auth) {
		return { plugins: [credentialsProvider(auth.credentials)] }
	}

	const oidc = auth.oidc
	return {
		plugins: [
			genericOAuth({
				config: [
					{
						providerId: 'oidc',
						name: oidc.name,
						discoveryUrl: `${oidc.issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`,
						clientId: oidc.clientId,
						clientSecret: oidc.clientSecret,
						tokenEndpointAuth: { method: 'client_secret_basic' },
						scopes: ['openid', 'profile', 'email'],
						pkce: true,
						requireIdTokenVerification: true,
						disableProviderLogout: true
					}
				]
			})
		],
		onAPIError: { errorURL: new URL('/signin', baseURL).href }
	}
}

function credentialsProvider(admin: Credentials): BetterAuthPlugin {
	const email = `${admin.username}@luzzle.local`
	return {
		id: 'luzzle-credentials',
		endpoints: {
			signInCredentials: createAuthEndpoint(
				'/sign-in/credentials',
				{ method: 'POST', use: [formCsrfMiddleware] },
				async (ctx) => {
					const identity = verifyCredentials(admin, ctx.body)
					if (!identity) {
						throw new APIError('UNAUTHORIZED', {
							code: 'CredentialsSignin',
							message: 'Invalid username or password'
						})
					}

					const adapter = ctx.context.internalAdapter
					const existing = await adapter.findUserByEmail(email)
					let user = existing?.user
					if (!user) {
						user = await adapter.createUser(
							{ name: identity.name, email, emailVerified: true },
							{ method: 'luzzle-credentials' }
						)
					}
					const session = await adapter.createSession(user.id)
					if (!session) throw new APIError('INTERNAL_SERVER_ERROR')
					await setSessionCookie(ctx, { session, user })
					return ctx.json({ success: true })
				}
			)
		}
	}
}

export function verifyCredentials(admin: Credentials, submitted: unknown): { name: string } | null {
	if (typeof submitted !== 'object' || submitted === null) return null
	const { username, password } = submitted as Record<string, unknown>
	if (typeof username !== 'string') return null
	if (typeof password !== 'string') return null

	// Evaluate both fields even when the username is wrong.
	const validUsername = secretEquals(username, admin.username)
	const validPassword = secretEquals(password, admin.password)
	if (!validUsername || !validPassword) return null
	return { name: admin.username }
}

function secretEquals(value: string, expected: string): boolean {
	const left = Buffer.from(value)
	const right = Buffer.from(expected)
	if (left.length !== right.length) return false
	return timingSafeEqual(left, right)
}
