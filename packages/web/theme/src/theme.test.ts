import { describe, test, expect } from 'vitest'
import { validateConfig, type Config } from '@luzzle/web.config'
import { generateThemeCss } from './index.js'

describe('generateThemeCss', () => {
	test('generates theme CSS with custom font and colors', () => {
		const config = {
			theme: {
				globals: {
					'font-sans-name': '"Test Sans"',
					'font-sans-weight': '300 600',
					'font-sans-url': '"/test.woff2"'
				},
				light: {
					'colors-primary': '#000000'
				},
				dark: {
					'colors-primary': '#ffffff'
				},
				markdown: {
					code: {
						light: 'github-light',
						dark: 'github-dark'
					},
					sidenote: {}
				}
			}
		} as unknown as Config

		const css = generateThemeCss(config)

		expect(css).toContain('--font-sans-name: "Test Sans";')
		expect(css).toContain('--colors-primary: #000000;')
		expect(css).toContain('--colors-primary: #ffffff;')
	})

	test('uses the public font basename without leaking directories or mutating its source', () => {
		const config = validateConfig({
			content: { fonts: { sans: '/private/owner/font.woff2' } },
			theme: {
				globals: {
					'font-sans-name': '"Local Sans"',
					'font-sans-weight': '200 800',
					'font-sans-url': '"https://external.test/ignored.woff2"'
				}
			}
		})
		const original = structuredClone(config)
		const css = generateThemeCss(config)
		expect(css).toContain('--font-sans-url: "/assets/fonts/font.woff2";')
		expect(css).toContain('src: url("/assets/fonts/font.woff2") format(\'woff2\');')
		expect(css).toContain('font-family: "Local Sans";')
		expect(css).toContain('font-weight: 200 800;')
		expect(css).not.toMatch(/private|owner|external\.test/)
		expect(config).toEqual(original)
	})

	test('quotes encoded font URLs safely, including punctuation', () => {
		const config = validateConfig({
			content: {
				fonts: { sans: `/private/owner/café 花 🌱 100% '"(!)*.woff2` }
			}
		})
		const css = generateThemeCss(config)
		const url = "/assets/fonts/caf%C3%A9%20%E8%8A%B1%20%F0%9F%8C%B1%20100%25%20'%22(!)*.woff2"
		expect(css).toContain(`--font-sans-url: "${url}";`)
		expect(css).toContain(`src: url("${url}") format('woff2');`)
		expect(css).not.toMatch(/private|owner/)
	})

	test('changing the configured font basename changes its CSS URL', () => {
		const first = generateThemeCss(
			validateConfig({
				content: { fonts: { sans: '/private/font.woff2' } }
			})
		)
		const second = generateThemeCss(
			validateConfig({
				content: { fonts: { sans: '/private/new-font.woff2' } }
			})
		)
		expect(first).toContain('url("/assets/fonts/font.woff2")')
		expect(second).toContain('url("/assets/fonts/new-font.woff2")')
	})

	test('omitted fonts retain the bundled URL and custom theme URLs', () => {
		const defaults = generateThemeCss(validateConfig({}))
		expect(defaults).toContain('src: url("/fonts/noto-sans.woff2") format(\'woff2\');')
		expect(defaults).not.toContain('/assets/fonts/')
		const custom = generateThemeCss(
			validateConfig({
				theme: {
					globals: { 'font-sans-url': '"https://cdn.test/font.woff2"' }
				}
			})
		)
		expect(custom).toContain('url("https://cdn.test/font.woff2")')
	})

	test('returns empty string when theme config is missing', () => {
		expect(generateThemeCss({} as Config)).toEqual('')
	})

	test('falls back to default font values when globals are empty', () => {
		const config = {
			theme: {
				globals: {},
				light: {},
				dark: {},
				markdown: {}
			}
		} as Config
		const css = generateThemeCss(config)
		expect(css).toContain('font-family: "Noto Sans";')
		expect(css).toContain('font-weight: 300 600;')
		expect(css).toContain('src: url("/fonts/noto-sans.woff2") format(\'woff2\');')
	})

	test('handles nested objects, arrays, and falsy values in variable blocks', () => {
		const config = {
			theme: {
				globals: {
					nested: { key: 'value' },
					list: ['a', 'b'],
					falsy: null
				},
				light: {},
				dark: {},
				markdown: {}
			}
		} as unknown as Config
		const css = generateThemeCss(config)
		expect(css).toContain('--key: value;')
		expect(css).toContain('--list: a,b;')
		expect(css).toContain('--falsy: null;')
	})

	test('handles missing globals, light, dark, and markdown keys', () => {
		const css = generateThemeCss({ theme: {} } as Config)
		expect(css).toBeDefined()
	})
})
