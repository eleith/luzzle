import { describe, expect, test, afterEach } from 'vitest'
import * as markdown from './markdown.js'

const mocks = {}

describe('./lib/markdown.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach(() => {
			//mock.mockReset()
			//mock.mockClear()
		})
	})

test('extract markdown and frontmatter', async () => {
		const contents = '---\na: awesome\nb: banana\n---\nthis is markdown'

		const extracted = await markdown.extractFullMarkdown(contents)

		expect(extracted.frontmatter).toEqual({ a: 'awesome', b: 'banana' })
		expect(extracted.markdown).toBe('this is markdown')
	})

	test('should not escape footnotes', async () => {
		const contents = `--- 
a: awesome
b: banana
---
Here is a footnote reference,[^1] and another.[^longnote]

[^1]: Here is the footnote.
[^longnote]: Here's one with multiple blocks.
`
		const extracted = await markdown.extractFullMarkdown(contents)
		expect(extracted.markdown).toBe(
			`Here is a footnote reference,[^1] and another.[^longnote]

[^1]: Here is the footnote.
[^longnote]: Here's one with multiple blocks.`
		)
	})
})
