import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, symlink, truncate, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { siteImageDefaults, validateConfig } from '@luzzle/web.config'
import { makeConfig } from './config.fixture.js'
import { createSiteImageHandler, MAX_SITE_IMAGE_BYTES, siteImageUrls } from './site-images.js'
import type { SiteImage } from '#lib/site-images.js'

let directory: string
beforeEach(async () => {
	const cache = path.resolve('node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'site-images-'))
})
afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

function configuration(images?: Partial<Record<SiteImage, string>>) {
	const config = makeConfig()
	config.content.images = validateConfig(images ? { content: { images } } : {}, {}).content.images
	config.paths.config = path.join(directory, 'config.yaml')
	return config
}

function request(method = 'GET', headers: HeadersInit = {}) {
	return new Request('https://garden.test/site-assets/favicon?file=/private/other.png', {
		method,
		headers
	})
}

async function expectNotFound(response: Response, method = 'GET') {
	expect(response.status).toBe(404)
	expect(response.headers.get('cache-control')).toBe('no-store')
	expect(response.headers.get('content-length')).toBe('9')
	expect(response.headers.get('x-content-type-options')).toBe('nosniff')
	expect(await response.text()).toBe(method === 'HEAD' ? '' : 'Not found')
}

describe('selected image responses', () => {
	test.each([
		['favicon', 'png', 'image/png'],
		['favicon', 'SVG', 'image/svg+xml'],
		['favicon', 'ico', 'image/x-icon'],
		['opengraph', 'png', 'image/png'],
		['opengraph', 'jpg', 'image/jpeg'],
		['opengraph', 'jpeg', 'image/jpeg'],
		['opengraph', 'webp', 'image/webp'],
		['opengraph', 'gif', 'image/gif']
	] as const)('serves selected %s .%s bytes with %s metadata', async (role, extension, mime) => {
		const bytes = Buffer.from('selected image bytes with café')
		const filename = `private family.${extension}`
		await writeFile(path.join(directory, filename), bytes)
		const serve = createSiteImageHandler(configuration({ [role]: filename }))
		const etag = `"${createHash('sha256').update(bytes).digest('base64url')}"`
		for (const method of ['GET', 'HEAD']) {
			const response = await serve(role, request(method))
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe(mime)
			expect(response.headers.get('content-length')).toBe(String(bytes.length))
			expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
			expect(response.headers.get('x-content-type-options')).toBe('nosniff')
			expect(response.headers.get('etag')).toBe(etag)
			expect(Buffer.from(await response.arrayBuffer())).toEqual(
				method === 'HEAD' ? Buffer.alloc(0) : bytes
			)
			if (method === 'HEAD') expect(response.body).toBeNull()
			const otherRole = role === 'favicon' ? 'opengraph' : 'favicon'
			await expectNotFound(await serve(otherRole, request(method)), method)
		}
	})

	test('uses supplied config filename rather than the symlink target or working directory', async () => {
		await mkdir(path.join(directory, 'config'))
		await mkdir(path.join(directory, 'content'))
		await writeFile(path.join(directory, 'config/config.yaml'), '')
		await symlink('config/config.yaml', path.join(directory, 'config.yaml'))
		await writeFile(path.join(directory, 'content/icon.png'), 'correct')
		const serve = createSiteImageHandler(configuration({ favicon: './content/icon.png' }))
		expect(await (await serve('favicon', request())).text()).toBe('correct')
	})

	test('accepts an absolute selected filename without a supplied config path', async () => {
		const filename = path.join(directory, 'icon.png')
		await writeFile(filename, 'absolute')
		const config = configuration({ favicon: filename })
		delete config.paths.config
		expect(await (await createSiteImageHandler(config)('favicon', request())).text()).toBe(
			'absolute'
		)
	})

	test('returns 304 for current strong, weak, list, and wildcard validators, but not stale ones', async () => {
		await writeFile(path.join(directory, 'icon.png'), 'current')
		const serve = createSiteImageHandler(configuration({ favicon: 'icon.png' }))
		const etag = (await serve('favicon', request())).headers.get('etag')!
		for (const validator of [etag, `W/${etag}`, `"old", W/${etag}`, '*']) {
			for (const method of ['GET', 'HEAD']) {
				const response = await serve('favicon', request(method, { 'if-none-match': validator }))
				expect(response.status).toBe(304)
				expect(response.body).toBeNull()
				expect(response.headers.get('etag')).toBe(etag)
				expect(response.headers.has('content-length')).toBe(false)
			}
		}
		expect((await serve('favicon', request('GET', { 'if-none-match': '"old"' }))).status).toBe(200)
	})

	test('ignores ranges and stale compressed siblings, regardless of request source hints', async () => {
		await writeFile(path.join(directory, 'icon.png'), 'current')
		await writeFile(path.join(directory, 'icon.png.gz'), 'old gzip')
		await writeFile(path.join(directory, 'icon.png.br'), 'old brotli')
		const serve = createSiteImageHandler(configuration({ favicon: 'icon.png' }))
		const response = await serve(
			'favicon',
			request('GET', {
				'accept-encoding': 'br, gzip',
				range: 'bytes=0-1',
				'x-image-source': '/private/other.png'
			})
		)
		expect(response.status).toBe(200)
		expect(response.headers.get('content-length')).toBe('7')
		for (const header of ['content-encoding', 'content-range', 'accept-ranges']) {
			expect(response.headers.has(header)).toBe(false)
		}
		expect(await response.text()).toBe('current')
	})

	test('retains selected bytes and ETags until a new handler is created', async () => {
		const filename = path.join(directory, 'icon.png')
		await writeFile(filename, 'first')
		const config = configuration({ favicon: 'icon.png' })
		const serve = createSiteImageHandler(config)
		const first = await serve('favicon', request())
		const etag = first.headers.get('etag')!
		await writeFile(filename, 'other')
		expect(await (await serve('favicon', request())).text()).toBe('first')
		const restarted = await createSiteImageHandler(config)(
			'favicon',
			request('GET', { 'if-none-match': etag })
		)
		expect(restarted.status).toBe(200)
		expect(restarted.headers.get('etag')).not.toBe(etag)
		expect(await restarted.text()).toBe('other')
	})

	test.each([undefined, {}, siteImageDefaults])(
		'returns no-store GET/HEAD 404s for built-in selections %j',
		async (images) => {
			const serve = createSiteImageHandler(configuration(images))
			for (const role of ['favicon', 'opengraph'] as const) {
				for (const method of ['GET', 'HEAD']) {
					await expectNotFound(await serve(role, request(method)), method)
				}
			}
		}
	)

	test('does not read built-in roles or accept an unknown role', async () => {
		const config = configuration()
		delete config.paths.config
		const serve = createSiteImageHandler(config)
		for (const role of [
			'favicon',
			'opengraph',
			'other',
			'../favicon',
			'constructor',
			'__proto__'
		]) {
			await expectNotFound(await serve(role, request()))
		}
	})

	test.each(['missing.png', 'empty.png', 'directory.png', 'large.png', 'pipe.png'])(
		'returns safe no-store GET/HEAD 404s for %s',
		async (filename) => {
			await writeFile(path.join(directory, 'empty.png'), '')
			await mkdir(path.join(directory, 'directory.png'))
			await writeFile(path.join(directory, 'large.png'), '')
			await truncate(path.join(directory, 'large.png'), MAX_SITE_IMAGE_BYTES + 1)
			execFileSync('mkfifo', [path.join(directory, 'pipe.png')])
			const serve = createSiteImageHandler(configuration({ favicon: filename }))
			for (const method of ['GET', 'HEAD'])
				await expectNotFound(await serve('favicon', request(method)), method)
		}
	)

	test('accepts exactly the size limit and caches unavailable selections until restart', async () => {
		const bytes = Buffer.alloc(MAX_SITE_IMAGE_BYTES, 42)
		await writeFile(path.join(directory, 'limit.png'), bytes)
		const response = await createSiteImageHandler(configuration({ opengraph: 'limit.png' }))(
			'opengraph',
			request()
		)
		expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true)
		const config = configuration({ favicon: 'late.png' })
		const serve = createSiteImageHandler(config)
		await expectNotFound(await serve('favicon', request()))
		await writeFile(path.join(directory, 'late.png'), 'late')
		await expectNotFound(await serve('favicon', request()))
		expect(await (await createSiteImageHandler(config)('favicon', request())).text()).toBe('late')
	})

	test('requires a supplied config path for relative selections', async () => {
		const config = configuration({ favicon: 'icon.png' })
		delete config.paths.config
		await expectNotFound(await createSiteImageHandler(config)('favicon', request()))
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
				favicon: '/site-assets/favicon',
				opengraph: 'https://public.test/site-assets/opengraph'
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
					role === 'favicon' ? '/site-assets/favicon' : '/cdn/images/favicon.png'
				)
				expect(urls.opengraph).toBe(
					`https://public.test/${role === 'opengraph' ? 'site-assets/opengraph' : 'cdn/images/opengraph.png'}`
				)
			}
		}
	)
})
