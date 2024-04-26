import { describe, expect, test, vi, afterEach } from 'vitest'
import * as frontmatter from './frontmatter.js'
import { stringify } from 'yaml'

vi.mock('yaml')

const mocks = {
	stringify: vi.mocked(stringify),
}

describe('src/lib/frontmatter.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
			mock.mockClear()
		})
	})

	test('addFrontMatter', () => {
		const markdown = 'this is markdown'
		const metadata = {
			a: 'awesome',
			b: 'banana',
		}
		const yamlstring = 'yaml-front-matter'

		mocks.stringify.mockReturnValueOnce(yamlstring)

		const combined = frontmatter.addFrontMatter(markdown, metadata)
		expect(combined).toBe(`---\n${yamlstring}---\n${markdown}\n`)
	})

	test('addFrontMatter with no markdown', () => {
		const metadata = {
			a: 'awesome',
			b: 'banana',
		}
		const yamlstring = 'yaml-front-matter'

		mocks.stringify.mockReturnValueOnce(yamlstring)

		const combined = frontmatter.addFrontMatter(null, metadata)
		expect(combined).toBe(`---\n${yamlstring}---\n\n`)
	})
})
