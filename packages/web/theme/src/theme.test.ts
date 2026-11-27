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

	test('uses each public font basename without leaking directories or mutating its source', () => {
		const config = validateConfig({
			content: { fonts: { sans: '/private/owner/font.woff2', mono: '/private/owner/code face.woff2' } },
			theme: {
				globals: {
					'font-sans-name': '"Local Sans"',
					'font-sans-weight': '200 800',
					'font-sans-url': '"https://external.test/ignored.woff2"',
					'font-mono-name': '"Local Mono"',
					'font-mono-weight': '500',
					'font-mono-url': '"https://external.test/ignored-mono.woff2"'
				}
			}
		})
		const original = structuredClone(config)
		const css = generateThemeCss(config)
		expect(css).toContain('--font-sans-url: "/assets/fonts/font.woff2";')
		expect(css).toContain('--font-mono-url: "/assets/fonts/code%20face.woff2";')
		const faces = css.match(/@font-face\s*\{[^}]*\}/g) || []
		const sans = faces.find(face => face.includes('font-family: "Local Sans";'))
		const mono = faces.find(face => face.includes('font-family: "Local Mono";'))
		expect(sans).toContain('src: url("/assets/fonts/font.woff2") format(\'woff2\');')
		expect(sans).toContain('font-weight: 200 800;')
		expect(mono).toContain('src: url("/assets/fonts/code%20face.woff2") format(\'woff2\');')
		expect(mono).toContain('font-weight: 500;')
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
		expect(defaults).toContain('font-family: "Noto Sans Mono";')
		expect(defaults).toContain('src: url("/fonts/noto-sans-mono.woff2") format(\'woff2\');')
		expect(defaults).not.toContain('/assets/fonts/')
		const custom = generateThemeCss(
			validateConfig({
				theme: {
					globals: {
						'font-sans-url': '"https://cdn.test/font.woff2"',
						'font-mono-url': '"https://cdn.test/code.woff2"'
					}
				}
			})
		)
		expect(custom).toContain('url("https://cdn.test/font.woff2")')
		expect(custom).toContain('url("https://cdn.test/code.woff2")')
	})

	test('selecting a monospace stack does not rename the bundled font', () => {
		const config = validateConfig({ theme: { globals: { 'font-mono-name': 'Monaco, monospace' } } })
		const css = generateThemeCss(config)
		expect(css).toContain('--font-mono-name: Monaco, monospace;')
		expect(css).toContain('font-family: "Noto Sans Mono";')
		expect(css).not.toContain('font-family: "Monaco";')
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
		expect(css).toContain('font-weight: 100 900;')
		expect(css).toContain('src: url("/fonts/noto-sans.woff2") format(\'woff2\');')
		expect(css).toContain('font-family: "Noto Sans Mono";')
		expect(css).toContain('font-weight: 400;')
		expect(css).toContain('src: url("/fonts/noto-sans-mono.woff2") format(\'woff2\');')
		expect(css).toMatch(/:where\(pre, code, kbd, samp\)\s*\{\s*font-family: var\(--font-mono-name\), monospace;/)
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
