import { createAuthClient } from 'better-auth/svelte'

let client: ReturnType<typeof createAuthClient> | undefined
function getAuthClient() {
	if (!client) client = createAuthClient()
	return client
}

export type AuthFailure = 'CredentialsSignin' | 'RateLimited' | 'NetworkError' | 'AuthError'

function failureReason(status: number): AuthFailure {
	if (status === 429) return 'RateLimited'
	return 'AuthError'
}

export async function signInCredentials(
	username: string,
	password: string
): Promise<AuthFailure | null> {
	try {
		const { error } = await getAuthClient().$fetch('/sign-in/credentials', {
			method: 'POST',
			body: { username, password }
		})
		if (!error) return null
		if (error.status === 401) return 'CredentialsSignin'
		return failureReason(error.status)
	} catch {
		return 'NetworkError'
	}
}

export async function signInOidc(redirectTo: string): Promise<AuthFailure | null> {
	const query = new URLSearchParams({ redirectTo })
	try {
		const { error } = await getAuthClient().signIn.social({
			provider: 'oidc',
			callbackURL: redirectTo,
			errorCallbackURL: `/signin?${query}`
		})
		if (!error) return null
		return failureReason(error.status)
	} catch {
		return 'NetworkError'
	}
}

export async function signOut(): Promise<AuthFailure | null> {
	try {
		const { error } = await getAuthClient().signOut()
		if (!error) return null
		return failureReason(error.status)
	} catch {
		return 'NetworkError'
	}
}
