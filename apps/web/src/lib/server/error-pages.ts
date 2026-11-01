import { building } from '$app/env'
import { routes } from '$app/manifest'
import type { HandleServerError } from '@sveltejs/kit/hooks'
import type { RequestEvent } from '@sveltejs/kit'
import type { ErrorPresentation } from '#lib/content/errors.js'
import { negotiate } from '#lib/utils/http.js'
import type { AppConfig } from './config.js'
import { loadPageMarkdown } from './pages.js'

const pageRoutes = new Set<string>(routes.filter((route) => route.page).map((route) => route.id))

function usesErrorPage(event: RequestEvent): boolean {
	if (event.isSubRequest || event.isRemoteRequest) return false
	if (event.request.headers.get('x-sveltekit-action') === 'true') return false
	if (event.route.id !== null && !pageRoutes.has(event.route.id)) return false
	if (event.isDataRequest) return true

	const fallback = event.request.method === 'POST' ? '*/*' : 'text/html'
	const accept = event.request.headers.get('accept') ?? fallback
	return negotiate(accept, ['application/json', 'text/html']) === 'text/html'
}

function selectErrorPage(status: number, pages: AppConfig['pages']['error']) {
	if (status === 404) return pages['404']
	if (status >= 400 && status < 500) return pages['4xx']
	if (status >= 500 && status < 600) return pages['500']
}

export function createErrorHandler(configuration: AppConfig): HandleServerError {
	return async (input) => {
		if (input.kind === 'unknown') console.error(input.error)
		if (input.kind === 'validation') {
			console.error('Remote function schema validation failed:', input.issues)
			return
		}
		if (building || !usesErrorPage(input.event)) return

		const status = input.kind === 'unknown' ? 500 : input.error.status
		const page = selectErrorPage(status, configuration.pages.error)
		if (!page) return
		if (page.body === undefined && page.home) return

		const presentation: ErrorPresentation = { home: page.home }
		if (page.body === undefined) return { presentation }
		try {
			presentation.html = await loadPageMarkdown(page.body, configuration.paths.config)
		} catch {
			console.error('Unable to load configured error Markdown; using the built-in page.')
		}
		return { presentation }
	}
}
