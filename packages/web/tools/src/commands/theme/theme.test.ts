import { describe, test, expect } from 'vitest'
import { generateThemeCss } from './theme.js'
import { type Config } from '@luzzle/web.config'

describe('generate-theme/theme', () => {
	test('should generate theme CSS', () => {
		const config = {
			url: { app: '', app_assets: '', luzzle_assets: '' },
			auth: { enabled: false, type: 'oidc', secret: '', oidc: { issuer: '', clientId: '', clientSecret: '' } },
			storage: { root: '' },
			sync: { remote: '', path: '', config: '/app/rclone/rclone.conf' },
			ai: { provider: 'google', api_key: '' },
			assets: { salt: 'test-salt' },
			paths: { database: '', assets: '', cache: '' },
			content: { component: { root: '', feed: '' }, text: { title: '', description: '' } },
			pieces: [{ type: 'test', fields: { title: 'test', date_consumed: 'test' } }],
			theme: {
				globals: {
					'font-sans-name': '"Test Sans"',
					'font-sans-weight': '300 600',
					'font-sans-url': '"/test.woff2"',
				},
				light: {
					'colors-primary': '#000000',
				},
				dark: {
					'colors-primary': '#ffffff',
				},
				markdown: {
					code: {
						light: 'github-light',
						dark: 'github-dark',
					},
					sidenote: {
					}
				},
			},
		} as Config

		const css = generateThemeCss(config)

		expect(css).toContain('--font-sans-name: "Test Sans";')
		expect(css).toContain('--colors-primary: #000000;')
		expect(css).toContain('--colors-primary: #ffffff;')
	})

	test('should return empty string if themeConfig is missing', () => {
		const config = {} as Config
		const css = generateThemeCss(config)
		expect(css).toEqual('')
	})

	test('should use default font values if globals are missing or theme values are empty', () => {
		const config = {
			theme: {
				globals: {},
				light: {},
				dark: {},
				markdown: {},
			},
		} as unknown as Config
		const css = generateThemeCss(config)
		expect(css).toContain('font-family: "Noto Sans";')
		expect(css).toContain('font-weight: 300 600;')
		expect(css).toContain('src: url("/fonts/noto-sans.woff2") format(\'woff2\');')
	})

	test('should handle nested values, array, and falsy values in createCssVariableBlock', () => {
		const config = {
			theme: {
				globals: {
					nested: {
						key: 'value',
					},
					list: ['a', 'b'],
					falsy: null,
				},
				light: {},
				dark: {},
				markdown: {},
			},
		} as unknown as Config
		const css = generateThemeCss(config)
		expect(css).toContain('--key: value;')
		expect(css).toContain('--list: a,b;')
		expect(css).toContain('--falsy: null;')
	})

	test('should handle missing globals, light, dark, and markdown keys', () => {
		const config = {
			theme: {},
		} as Config
		const css = generateThemeCss(config)
		expect(css).toBeDefined()
	})
})
