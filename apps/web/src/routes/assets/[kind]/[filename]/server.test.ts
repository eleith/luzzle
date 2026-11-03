import { beforeEach, expect, test, vi } from 'vitest'
import { siteImageDefaults } from '@luzzle/web.config'
import type { RequestHandler } from './$types'

const { config, readConfiguredAsset } = vi.hoisted(() => ({
	config: {
		content: {
			images: { favicon: '', opengraph: '' },
			fonts: {} as { sans?: string }
		},
		paths: { config: '/private/config.yaml' }
	},
	readConfiguredAsset: vi.fn()
}))

vi.mock('#lib/server/config.js', () => ({ config }))
vi.mock('@luzzle/web.config/assets', () => ({
	readConfiguredAsset,
	MAX_CONFIGURED_ASSET_BYTES: 5 * 1024 * 1024
}))

beforeEach(() => {
	vi.resetModules()
	vi.clearAllMocks()
	config.content.images = {
		favicon: '/private/icons/shared.png',
		opengraph: '/private/cards/shared.png'
	}
	config.content.fonts = { sans: '/private/fonts/site font %é.woff2' }
	readConfiguredAsset.mockResolvedValue(new TextEncoder().encode('selected bytes'))
})

async function request(kind: string, filename: string, method = 'GET') {
	const route = await import('./+server.js')
	const handler = method === 'HEAD' ? route.HEAD : route.GET
	return handler({
		params: { kind, filename },
		request: new Request(
			`https://garden.test/assets/${kind}/${encodeURIComponent(filename)}?file=/private/other`,
			{ method }
		)
	} as Parameters<RequestHandler>[0])
}

test.each([
	['favicon', 'shared.png', '/private/icons/shared.png', 'image/png'],
	['opengraph', 'shared.png', '/private/cards/shared.png', 'image/png'],
	['fonts', 'site font %é.woff2', '/private/fonts/site font %é.woff2', 'font/woff2']
])(
	'serves only the configured %s filename, including GET/HEAD',
	async (kind, filename, source, mime) => {
		const response = await request(kind, filename)
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe(mime)
		expect(await response.text()).toBe('selected bytes')
		expect(readConfiguredAsset).toHaveBeenCalledExactlyOnceWith(config, source)
		const head = await request(kind, filename, 'HEAD')
		expect(head.status).toBe(200)
		expect(head.headers.get('content-length')).toBe('14')
		expect(head.body).toBeNull()
		expect(readConfiguredAsset).toHaveBeenCalledTimes(2)
	}
)

test.each([
	['favicon', 'old.png'],
	['fonts', 'other.woff2'],
	['unknown', 'shared.png'],
	['constructor', 'shared.png'],
	['__proto__', 'shared.png'],
	['favicon', '../icons/shared.png'],
	['favicon', '/private/icons/shared.png'],
	['favicon', 'shared%2Epng'],
	['fonts', 'site font %é.woff2/extra']
])('rejects %s/%s before reading any filesystem source', async (kind, filename) => {
	for (const method of ['GET', 'HEAD']) {
		const response = await request(kind, filename, method)
		expect(response.status).toBe(404)
		expect(response.headers.get('cache-control')).toBe('no-store')
		expect(await response.text()).toBe(method === 'HEAD' ? '' : 'Not found')
	}
	expect(readConfiguredAsset).not.toHaveBeenCalled()
})

test('does not publish bundled defaults through configured-file routes', async () => {
	config.content.images = { ...siteImageDefaults }
	config.content.fonts = {}
	for (const [kind, filename] of [
		['favicon', 'favicon.png'],
		['opengraph', 'opengraph.png'],
		['fonts', 'noto-sans.woff2']
	])
		expect((await request(kind, filename)).status).toBe(404)
	expect(readConfiguredAsset).not.toHaveBeenCalled()
})

test('reads the selected file after rejecting an unrelated filename', async () => {
	expect((await request('favicon', 'wrong.png')).status).toBe(404)
	const response = await request('favicon', 'shared.png')
	expect(response.status).toBe(200)
	expect(await response.text()).toBe('selected bytes')
	expect(readConfiguredAsset).toHaveBeenCalledOnce()
})
