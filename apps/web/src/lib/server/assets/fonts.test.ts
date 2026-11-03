import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { validateConfig } from '@luzzle/web.config'
import { readConfiguredAsset } from '@luzzle/web.config/assets'
import type * as ConfiguredAssets from '@luzzle/web.config/assets'
import { createSiteFontHandler } from './fonts.js'

vi.mock('@luzzle/web.config/assets', () => ({ readConfiguredAsset: vi.fn() }))

beforeEach(() => {
	vi.mocked(readConfiguredAsset).mockReset()
})

function configuration(source?: string) {
	const config = validateConfig({ content: { fonts: source ? { sans: source } : {} } }, {})
	config.paths.config = '/private/config.yaml'
	return config
}

function request() {
	return new Request('https://garden.test/assets/fonts/other.woff2?file=/private/other.woff2', {
		headers: { 'x-font-source': '/private/other.woff2' }
	})
}

describe('configured font selection', () => {
	test.each(['./private family.woff2', '/private/font.WOFF2'])(
		'passes the selected source %s to the reader with the WOFF2 type',
		async (source) => {
			const bytes = new TextEncoder().encode('selected font')
			vi.mocked(readConfiguredAsset).mockResolvedValue(bytes)
			const config = configuration(source)
			const response = await createSiteFontHandler(config)(request())
			expect(readConfiguredAsset).toHaveBeenCalledExactlyOnceWith(config, source)
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe('font/woff2')
			expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
		}
	)

	test.each([{}, { content: { fonts: {} } }])(
		'does not read a font for omitted/default configuration %j',
		async (raw) => {
			const config = validateConfig(raw, {})
			expect((await createSiteFontHandler(config)(request())).status).toBe(404)
			expect(readConfiguredAsset).not.toHaveBeenCalled()
		}
	)

	test.each(['other.ttf', 'other.woff', 'other.png', ''])(
		'defensively rejects unsupported source %j',
		async (source) => {
			const config = configuration()
			// Bypass validation to exercise the runtime guard.
			config.content.fonts.sans = source
			expect((await createSiteFontHandler(config)(request())).status).toBe(404)
			expect(readConfiguredAsset).not.toHaveBeenCalled()
		}
	)

	test('returns not found when the selected font cannot be read', async () => {
		const config = configuration('missing.woff2')
		vi.mocked(readConfiguredAsset).mockResolvedValue(undefined)
		expect((await createSiteFontHandler(config)(request())).status).toBe(404)
		expect(readConfiguredAsset).toHaveBeenCalledExactlyOnceWith(config, 'missing.woff2')
	})

	test('wires the selected file through the configured-asset reader', async () => {
		const actual = await vi.importActual<typeof ConfiguredAssets>('@luzzle/web.config/assets')
		vi.mocked(readConfiguredAsset).mockImplementation(actual.readConfiguredAsset)
		const cache = path.resolve('node_modules/.cache')
		await mkdir(cache, { recursive: true })
		const directory = await mkdtemp(path.join(cache, 'site-fonts-'))
		try {
			await writeFile(path.join(directory, 'selected.WOFF2'), 'selected font')
			const config = configuration('./selected.WOFF2')
			config.paths.config = path.join(directory, 'config.yaml')
			const response = await createSiteFontHandler(config)(request())
			expect(await response.text()).toBe('selected font')
			expect(response.headers.get('content-type')).toBe('font/woff2')
			expect(readConfiguredAsset).toHaveBeenCalledExactlyOnceWith(config, './selected.WOFF2')
		} finally {
			await rm(directory, { recursive: true, force: true })
		}
	})
})
