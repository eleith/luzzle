import { describe, expect, test, vi, afterEach } from 'vitest'
import * as md from './md.js'
import { readFile } from 'fs/promises'

vi.mock('fs/promises')

const mocks = {
	readFile: vi.mocked(readFile),
}

describe('md', () => {
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

		const combined = md.addFrontMatter(markdown, metadata)
		expect(combined).toBe(together)
	})

	test('addFrontMatter with no markdown', () => {
		const metadata = {
			a: 'awesome',
			b: 'banana',
		}
		const together = '---\na: awesome\nb: banana\n---\n\n'

		const combined = md.addFrontMatter(null, metadata)
		expect(combined).toBe(together)
	})

	test('extract markdown and frontmatter', async () => {
		const path = 'path/to/file.md'
		const markdownWithFront = '---\na: awesome\nb: banana\n---\nthis is markdown'

		mocks.readFile.mockResolvedValueOnce(markdownWithFront)

		const extracted = await md.extract(path)

		expect(extracted.frontmatter).toEqual({ a: 'awesome', b: 'banana' })
		expect(extracted.markdown).toBe('this is markdown')
	})

	test('extract only frontmatter', async () => {
		const path = 'path/to/file.md'
		const markdownWithFront = '---\na: awesome\nb: banana\n---'

		mocks.readFile.mockResolvedValueOnce(markdownWithFront)

		const extracted = await md.extract(path)

		expect(extracted.frontmatter).toEqual({ a: 'awesome', b: 'banana' })
		expect(extracted.markdown).toBe('')
	})
})
