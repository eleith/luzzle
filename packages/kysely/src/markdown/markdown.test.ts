import { describe, expect, test, vi, afterEach } from 'vitest'
import * as markdown from './markdown.js'
import { readFile } from 'fs/promises'

vi.mock('fs/promises')

const mocks = {
	readFile: vi.mocked(readFile),
}

describe('src/markdown/markdown.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
			mock.mockClear()
		})
	})

	test('extract markdown and frontmatter', async () => {
		const path = 'path/to/file.md'
		const markdownWithFront = '---\na: awesome\nb: banana\n---\nthis is markdown'

		mocks.readFile.mockResolvedValueOnce(markdownWithFront)

		const extracted = await markdown.extractFullMarkdown(path)

		expect(extracted.frontmatter).toEqual({ a: 'awesome', b: 'banana' })
		expect(extracted.markdown).toBe('this is markdown')
	})

	test('extract only frontmatter', async () => {
		const path = 'path/to/file.md'
		const markdownWithFront = '---\na: awesome\nb: banana\n---'

		mocks.readFile.mockResolvedValueOnce(markdownWithFront)

		const extracted = await markdown.extractFullMarkdown(path)

		expect(extracted.frontmatter).toEqual({ a: 'awesome', b: 'banana' })
		expect(extracted.markdown).toBe('')
	})
})
