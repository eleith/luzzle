import { describe, test, expect, vi } from 'vitest'
import { generateThemeCss, minifyCss } from './theme.js'
import { AppConfig } from '../../lib/config-loader.js'
import { transform } from 'lightningcss'

vi.mock('lightningcss')

const mocks = {
	transform: vi.mocked(transform),
}

describe('generate-theme/theme', () => {
	test('should generate theme CSS', () => {
		const config: AppConfig = {
			url: { app: '', app_assets: '', luzzle_assets: '', editor: '' },
			text: { title: '', description: '' },
			paths: { database: '' },
			content: { block: { root: '', feed: '' } },
			pieces: [{ type: 'test', fields: { title: 'test', date_consumed: 'test' } }],
			theme: {
				version: '1.0.0',
				globals: {
					'font-sans-name': 'Test Sans',
					'font-sans-weight': '400',
					'font-sans-url': '/test.woff2',
				},
				light: {
					'colors-primary': '#000000',
				},
				dark: {
					'colors-primary': '#ffffff',
				},
			},
		};

		const css = generateThemeCss(config);

		expect(css).toContain('--font-sans-name: "Test Sans";');
		expect(css).toContain('--colors-primary: #000000;');
		expect(css).toContain('--colors-primary: #ffffff;');
	});

	test('should handle errors during CSS minification', () => {
		const originalCss = 'body { color: red; }'
		mocks.transform.mockImplementation(() => {
			throw new Error('Minification failed')
		})
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		const minifiedCss = minifyCss(originalCss)

		expect(minifiedCss).toEqual(originalCss)
		expect(consoleErrorSpy).toHaveBeenCalledWith('Error minifying CSS with Lightning CSS:', expect.any(Error))
		consoleErrorSpy.mockRestore()
	})
})
