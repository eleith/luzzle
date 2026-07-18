import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach } from 'vitest'
import { addFrontMatter } from '../../lib/frontmatter.js'
import type { PieceFrontmatter } from './frontmatter.js'
import type { PieceMarkdown } from './markdown.js'
import { makePieceMarkdown, makePieceMarkdownString } from './markdown.js'

vi.mock('ajv/dist/jtd.js')
vi.mock('../../lib/frontmatter.js')

const mocks = {
	addFrontMatter: vi.mocked(addFrontMatter),
}

const spies: { [key: string]: MockInstance } = {}

describe('pieces/utils/markdown.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('makePieceMarkdownOrThrow', async () => {
		const note = 'a tale of two mark downs'
		const path = 'path/to/some-piece.md'
		const piece = 'books'
		const frontmatter = { title: 'two', metadata: 'three' }

		const md = makePieceMarkdown(path, piece, note, frontmatter)

		expect(md).toEqual({
			filePath: path,
			piece,
			frontmatter,
			note,
		})
	})

	test('makePieceMardownString', () => {
		makePieceMarkdownString({} as unknown as PieceMarkdown<PieceFrontmatter>)
		expect(mocks.addFrontMatter).toHaveBeenCalled()
	})
})
