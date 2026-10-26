import type { Config } from '@luzzle/web.config'
import type { Handle } from '@sveltejs/kit'

type AssetUrls = Pick<Config['url'], 'app_assets' | 'luzzle_assets'>
type AssetSources = ReadonlyMap<string, readonly string[]>

function assetSource(value: string, field: string): string | undefined {
	if (!value) return undefined
	const invalid = () =>
		new Error(
			`${field} must be an HTTP(S) URL prefix or a same-origin path without credentials, query, fragment or CSP delimiters.`
		)
	if (/[\s\p{Cc}\\;,'"<>`?#]/u.test(value)) throw invalid()

	const absolute = /^[a-z][a-z\d+.-]*:/i.test(value)
	if (!absolute) {
		if (value.startsWith('//')) throw invalid()
		return undefined
	}

	const authority = value.match(/^https?:\/\/([^/]+)/i)?.[1]
	if (!authority || authority.includes('@')) throw invalid()
	let url: URL
	try {
		url = new URL(value)
	} catch {
		throw invalid()
	}
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw invalid()
	if (url.hostname.includes('*')) throw invalid()
	return `${url.href.replace(/\/+$/, '')}/`
}

function assetSources(urls: AssetUrls): AssetSources {
	const app = assetSource(urls.app_assets, 'url.app_assets')
	const pieces = assetSource(urls.luzzle_assets, 'url.luzzle_assets')
	const appSources: string[] = []
	if (app) appSources.push(app)
	const imageSources = [...appSources]
	if (pieces && !imageSources.includes(pieces)) imageSources.push(pieces)

	return new Map([
		['script-src', appSources],
		['style-src', appSources],
		['font-src', appSources],
		['img-src', imageSources]
	])
}

function addAssetSources(policy: string, additions: AssetSources): string {
	if (policy.includes(',')) throw new Error('Expected a single generated CSP policy.')
	const directives = new Map<string, string[]>()
	for (const part of policy.split(';')) {
		const [name, ...sources] = part.trim().split(/\s+/)
		if (!name) continue
		const key = name.toLowerCase()
		if (directives.has(key)) throw new Error('Expected unique generated CSP directives.')
		directives.set(key, sources)
	}

	let changed = false
	for (const [name, additionsForDirective] of additions) {
		if (!additionsForDirective.length) continue
		const sources = directives.get(name)
		if (!sources || sources.includes("'none'"))
			throw new Error(`Cannot augment generated CSP directive ${name}.`)
		for (const source of additionsForDirective) {
			if (sources.includes(source)) continue
			sources.push(source)
			changed = true
		}
	}
	if (!changed) return policy
	return [...directives].map(([name, sources]) => [name, ...sources].join(' ')).join('; ')
}

export function createAssetCspHandle(urls: AssetUrls): Handle {
	const additions = assetSources(urls)
	if (![...additions.values()].some((sources) => sources.length)) {
		return ({ event, resolve }) => resolve(event)
	}

	return async ({ event, resolve }) => {
		const response = await resolve(event)
		const policy = response.headers.get('content-security-policy')
		if (!policy || !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? ''))
			return response
		const updated = addAssetSources(policy, additions)
		if (updated === policy) return response
		const headers = new Headers(response.headers)
		headers.set('content-security-policy', updated)
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		})
	}
}
