import { describe, test, expect } from 'vitest'
import { generateThemeCss } from './build-theme.js'

describe('build-theme/generateThemeCss', () => {
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
		}

		const css = generateThemeCss(config)

		expect(css).toContain('--font-sans-name: "Test Sans";')
		expect(css).toContain('--colors-primary: #000000;')
		expect(css).toContain('--colors-primary: #ffffff;')
	})

	test('returns empty string when theme config is missing', () => {
		expect(generateThemeCss({})).toEqual('')
	})

	test('falls back to default font values when globals are empty', () => {
		const config = {
			theme: {
				globals: {},
				light: {},
				dark: {},
				markdown: {}
			}
		}
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
		}
		const css = generateThemeCss(config)
		expect(css).toContain('--key: value;')
		expect(css).toContain('--list: a,b;')
		expect(css).toContain('--falsy: null;')
	})

	test('handles missing globals, light, dark, and markdown keys', () => {
		const css = generateThemeCss({ theme: {} })
		expect(css).toBeDefined()
	})
})
