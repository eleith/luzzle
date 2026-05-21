import { describe, test, expect } from 'vitest'
import { generateThemeCss } from './theme.js'
import type { Config } from '@luzzle/web.config'

describe('pieces/theme', () => {
	test('generates empty string when theme config is missing', () => {
		const config = {} as Config
		expect(generateThemeCss(config)).toBe('')
	})

	test('generates theme CSS with globals, light, dark, and markdown blocks', () => {
		const config = {
			theme: {
				globals: {
					'font-sans-name': '"Custom Font"',
					'font-sans-weight': '400',
					'font-sans-url': '"/fonts/custom.woff2"',
					'font-size-root': 16,
					spacing: {
						unit: '8px'
					}
				},
				light: {
					'color-primary': '#ffffff'
				},
				dark: {
					'color-primary': '#000000'
				},
				markdown: {
					'line-height': '1.5'
				}
			}
		} as unknown as Config

		const css = generateThemeCss(config)

		expect(css).toContain('--font-sans-name: "Custom Font";')
		expect(css).toContain('--font-sans-weight: 400;')
		expect(css).toContain('--font-sans-url: "/fonts/custom.woff2";')
		expect(css).toContain('--unit: 8px;')
		expect(css).toContain('--color-primary: #ffffff;')
		expect(css).toContain('--color-primary: #000000;')
		expect(css).toContain('--line-height: 1.5;')
		expect(css).toContain('font-family: "Custom Font";')
		expect(css).toContain('font-weight: 400;')
		expect(css).toContain('src: url("/fonts/custom.woff2") format(\'woff2\');')
	})
})
