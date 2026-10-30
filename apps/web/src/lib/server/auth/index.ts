import type { Config } from '@luzzle/web.config'
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal'
import { buildAuthOptions } from './providers'

const WEEK_SECONDS = 7 * 24 * 60 * 60

export interface LuzzleSession {
	user?: { name: string; email: string; image?: string | null }
	expires: string
}

export function createAuth(auth: Config['auth'], baseURL: string) {
	if (!auth) return undefined
	if (auth.secret.length < 32) {
		throw new Error(
			'auth.secret must contain at least 32 characters after environment interpolation.'
		)
	}

	return betterAuth<BetterAuthOptions>({
		// Pin both native inputs so an environment keyring cannot override YAML.
		secret: auth.secret,
		secrets: [{ version: 1, value: auth.secret }],
		baseURL: baseURL.replace(/\/+$/, ''),
		telemetry: { enabled: false },
		session: {
			expiresIn: WEEK_SECONDS,
			disableSessionRefresh: true,
			cookieCache: { refreshCache: false }
		},
		account: {
			storeAccountCookie: false,
			accountLinking: { enabled: false }
		},
		advanced: {
			disableOriginCheck: false,
			ipAddress: { ipAddressHeaders: ['x-real-ip'] }
		},
		...buildAuthOptions(auth, baseURL),
		logger: {
			log: (level) => console[level]('Authentication event', { source: 'better-auth' })
		}
	})
}

type Auth = ReturnType<typeof createAuth>

export function createSessionReader(auth: Auth, headers: Headers) {
	async function readSession(): Promise<LuzzleSession | null> {
		if (!auth) return null
		const data = await auth.api.getSession({ headers })
		if (!data) return null
		return {
			user: { name: data.user.name, email: data.user.email, image: data.user.image },
			expires: data.session.expiresAt.toISOString()
		}
	}

	let session: Promise<LuzzleSession | null> | undefined
	return () => {
		if (!session) session = readSession()
		return session
	}
}
