import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { siteImageDefaults, validateConfig } from '@luzzle/web.config'
import { readConfiguredAsset } from '@luzzle/web.config/assets'
import type * as ConfiguredAssets from '@luzzle/web.config/assets'
import { makeConfig } from '../config.fixture.js'
import { createSiteImageHandler, siteImageUrls } from './images.js'
import type { SiteImage } from '#lib/site-images.js'

vi.mock('@luzzle/web.config/assets', () => ({ readConfiguredAsset: vi.fn() }))

beforeEach(() => {
	vi.mocked(readConfiguredAsset).mockReset()
})

function configuration(images?: Partial<Record<SiteImage, string>>) {
	const config = makeConfig()
	config.content.images = validateConfig(images ? { content: { images } } : {}, {}).content.images
	config.paths.config = '/private/config.yaml'
	return config
}

function request() {
	return new Request('https://garden.test/assets/favicon/selected.png?file=/private/other.png')
}

describe('configured image selection', () => {
	test.each([
		['favicon', 'png', 'image/png'],
		['favicon', 'SVG', 'image/svg+xml'],
		['favicon', 'ico', 'image/x-icon'],
		['opengraph', 'png', 'image/png'],
		['opengraph', 'jpg', 'image/jpeg'],
		['opengraph', 'jpeg', 'image/jpeg'],
		['opengraph', 'webp', 'image/webp'],
		['opengraph', 'gif', 'image/gif']
	] as const)('selects %s .%s with type %s', async (role, extension, mime) => {
		const source = `private family.${extension}`
		const bytes = new TextEncoder().encode('selected image')
		vi.mocked(readConfiguredAsset).mockResolvedValue(bytes)
		const config = configuration({ [role]: source })
		const serve = createSiteImageHandler(config)
		const response = await serve(role, request())
		expect(readConfiguredAsset).toHaveBeenCalledExactlyOnceWith(config, source)
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe(mime)
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)

		const otherRole = role === 'favicon' ? 'opengraph' : 'favicon'
		expect((await serve(otherRole, request())).status).toBe(404)
		expect(readConfiguredAsset).toHaveBeenCalledTimes(1)
	})

	test('loads both image roles independently', async () => {
		vi.mocked(readConfiguredAsset).mockImplementation(async (_config, source) =>
			new TextEncoder().encode(source)
		)
		const config = configuration({ favicon: 'icon.png', opengraph: 'card.jpg' })
		const serve = createSiteImageHandler(config)
		const icon = await serve('favicon', request())
		const card = await serve('opengraph', request())
		expect(await icon.text()).toBe('icon.png')
		expect(await card.text()).toBe('card.jpg')
		expect(icon.headers.get('content-type')).toBe('image/png')
		expect(card.headers.get('content-type')).toBe('image/jpeg')
		expect(card.headers.get('etag')).not.toBe(icon.headers.get('etag'))
		expect(readConfiguredAsset).toHaveBeenNthCalledWith(1, config, 'icon.png')
		expect(readConfiguredAsset).toHaveBeenNthCalledWith(2, config, 'card.jpg')
		expect(readConfiguredAsset).toHaveBeenCalledTimes(2)
	})

	test('an unavailable image does not prevent the other role from loading', async () => {
		vi.mocked(readConfiguredAsset).mockImplementation(async (_config, source) =>
			source === 'card.png' ? new TextEncoder().encode('card') : undefined
		)
		const serve = createSiteImageHandler(
			configuration({ favicon: 'missing.png', opengraph: 'card.png' })
		)
		expect((await serve('favicon', request())).status).toBe(404)
		expect(await (await serve('opengraph', request())).text()).toBe('card')
	})

	test.each([undefined, {}, siteImageDefaults])(
		'does not read omitted or built-in selections %j',
		async (images) => {
			const config = configuration(images)
			delete config.paths.config
			const serve = createSiteImageHandler(config)
			for (const role of ['favicon', 'opengraph']) {
				expect((await serve(role, request())).status).toBe(404)
			}
			expect(readConfiguredAsset).not.toHaveBeenCalled()
		}
	)

	test.each(['other', '../favicon', 'constructor', '__proto__'])(
		'rejects unknown role %s without reading configured images',
		async (role) => {
			const serve = createSiteImageHandler(
				configuration({ favicon: 'icon.png', opengraph: 'card.png' })
			)
			expect((await serve(role, request())).status).toBe(404)
			expect(readConfiguredAsset).not.toHaveBeenCalled()
		}
	)

	test.each([
		['favicon', 'icon.jpg'],
		['favicon', 'icon.txt'],
		['opengraph', 'card.svg'],
		['opengraph', 'card.ico']
	] as const)('defensively rejects unsupported %s source %s', async (role, source) => {
		const config = configuration()
		// Bypass validation to exercise the runtime guard.
		config.content.images[role] = source
		expect((await createSiteImageHandler(config)(role, request())).status).toBe(404)
		expect(readConfiguredAsset).not.toHaveBeenCalled()
	})

	test('wires the selected file to the reader, not compressed siblings or request hints', async () => {
		const actual = await vi.importActual<typeof ConfiguredAssets>('@luzzle/web.config/assets')
		vi.mocked(readConfiguredAsset).mockImplementation(actual.readConfiguredAsset)
		const cache = path.resolve('node_modules/.cache')
		await mkdir(cache, { recursive: true })
		const directory = await mkdtemp(path.join(cache, 'site-images-'))
		try {
			await writeFile(path.join(directory, 'icon.png'), 'selected')
			await writeFile(path.join(directory, 'icon.png.br'), 'stale brotli')
			await writeFile(path.join(directory, 'icon.png.gz'), 'stale gzip')
			const config = configuration({ favicon: './icon.png' })
			config.paths.config = path.join(directory, 'config.yaml')
			const response = await createSiteImageHandler(config)(
				'favicon',
				new Request('https://garden.test/assets/favicon/other.png?file=icon.png.br', {
					headers: { 'accept-encoding': 'br, gzip', 'x-image-source': 'icon.png.gz' }
				})
			)
			expect(await response.text()).toBe('selected')
			expect(response.headers.get('content-type')).toBe('image/png')
			expect(readConfiguredAsset).toHaveBeenCalledExactlyOnceWith(config, './icon.png')
		} finally {
			await rm(directory, { recursive: true, force: true })
		}
	})
})

describe('public site-image URL selection', () => {
	test.each([
		undefined,
		{},
		siteImageDefaults,
		{ favicon: siteImageDefaults.favicon },
		{ opengraph: siteImageDefaults.opengraph }
	])('keeps schema defaults on bundled URLs for input %j', (images) => {
		for (const appAssets of ['', '/cdn/', 'https://cdn.test/assets/']) {
			const config = configuration(images)
			expect(config.content.images).toEqual(siteImageDefaults)
			config.url.app = 'https://public.test'
			config.url.app_assets = appAssets
			const urls = siteImageUrls(config, new URL('http://internal.test/pieces/book'))
			const prefix = appAssets.replace(/\/+$/, '')
			expect(urls.favicon).toBe(`${prefix}/images/favicon.png`)
			expect(urls.opengraph).toBe(new URL(`${prefix}/images/opengraph.png`, config.url.app).href)
		}
	})

	test.each(['', '/garden', './garden', '//relative.example/garden'])(
		'uses request origin for relative app URL %s and never exposes source paths',
		(appUrl) => {
			const config = configuration({ favicon: '/private/icon.png', opengraph: '/private/card.png' })
			config.url.app = appUrl
			config.url.app_assets = 'https://cdn.test'
			expect(siteImageUrls(config, new URL('https://public.test/pieces/book'))).toEqual({
				favicon: '/assets/favicon/icon.png',
				opengraph: 'https://public.test/assets/opengraph/card.png'
			})
		}
	)

	test.each(['favicon', 'opengraph'] as const)(
		'selects %s independently of the other image',
		(role) => {
			for (const images of [
				{ [role]: '/private/selected.png' },
				{ ...siteImageDefaults, [role]: '/private/selected.png' }
			]) {
				const config = configuration(images)
				expect(config.content.images).toEqual({
					...siteImageDefaults,
					[role]: '/private/selected.png'
				})
				config.url.app = 'https://public.test'
				config.url.app_assets = '/cdn'
				const urls = siteImageUrls(config, new URL('http://internal.test'))
				expect(urls.favicon).toBe(
					role === 'favicon' ? '/assets/favicon/selected.png' : '/cdn/images/favicon.png'
				)
				expect(urls.opengraph).toBe(
					`https://public.test/${role === 'opengraph' ? 'assets/opengraph/selected.png' : 'cdn/images/opengraph.png'}`
				)
			}
		}
	)
})
