import { building } from '$app/environment'
import { config } from '$lib/server/config'
import { createAuthentication } from '$lib/server/authentication'
import { createAssetCspHandle } from '$lib/server/asset-csp'
import { prepareConfiguredStyles, renderConfiguredStyles } from '$lib/server/configured-styles'
import '$lib/server/database'
import { sequence } from '@sveltejs/kit/hooks'
import { json, redirect, type Handle } from '@sveltejs/kit'

async function prepareStartupStyles() {
	if (building) return ''
	return prepareConfiguredStyles(config)
}

function resolveRequest({ event, resolve }: Parameters<Handle>[0]) {
	return resolve(event)
}

function createAssetPolicy(): Handle {
	if (building) return resolveRequest
	return createAssetCspHandle(config.url)
}

const configuredStyles = await prepareStartupStyles()
const handleAssetCsp = createAssetPolicy()

const auth = config.auth
const authHandle = createAuthentication(auth, config.url.app_assets)

function isProtectedRoute(routeId: string | null) {
	return routeId === '/(auth)' || routeId?.startsWith('/(auth)/') === true
}

const guardHandle: Handle = async ({ event, resolve }) => {
	if (!isProtectedRoute(event.route.id)) return resolve(event)

	const headers = { 'Cache-Control': 'private, no-store' }
	event.setHeaders(headers)
	const { request } = event
	const browserGet =
		request.method === 'GET' &&
		(event.isDataRequest || request.headers.get('accept')?.includes('text/html'))
	const formAction =
		request.method === 'POST' && request.headers.get('x-sveltekit-action') === 'true'
	const shouldRedirect = browserGet || formAction

	if (!auth) {
		if (shouldRedirect) throw redirect(302, '/')
		return json({ message: 'Forbidden' }, { status: 403, headers })
	}

	const session = await event.locals.auth()
	if (session) return resolve(event)

	if (!shouldRedirect) return json({ message: 'Unauthorized' }, { status: 401, headers })
	const params = new URLSearchParams({ redirectTo: event.url.pathname + event.url.search })
	throw redirect(302, `/signin?${params}`)
}

const handleConfiguredStyles: Handle = (request) =>
	renderConfiguredStyles(request, configuredStyles)

function createRequestPipeline(): Handle {
	const handlers = [handleAssetCsp, handleConfiguredStyles]
	if (authHandle) handlers.push(authHandle.handle)
	handlers.push(guardHandle)
	return sequence(...handlers)
}

export const handle = createRequestPipeline()
