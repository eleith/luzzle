import { describe, expect, test, vi, afterEach } from 'vitest'
import * as frontmatter from './frontmatter.js'
import { readFile } from 'fs/promises'

vi.mock('fs/promises')

const mocks = {
	readFile: vi.mocked(readFile),
}

describe('src/markdown/frontmatter.ts', () => {
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
		const together = '---\na: awesome\nb: banana\n---\nthis is markdown\n'

		const combined = frontmatter.addFrontMatter(markdown, metadata)
		expect(combined).toBe(together)
	})

	test('addFrontMatter with no markdown', () => {
		const metadata = {
			a: 'awesome',
			b: 'banana',
		}
		const together = '---\na: awesome\nb: banana\n---\n\n'

		const combined = frontmatter.addFrontMatter(null, metadata)
		expect(combined).toBe(together)
	})
})
