import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import Ajv from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../markdown/frontmatter.js'
import { PieceFrontmatter } from './frontmatter.js'
import { PieceMarkdown } from './markdown.js'
import { PieceSelectable } from '../tables/pieces.schema.js'
import { makePieceMarkdownOrThrow, makePieceMarkdownString } from './markdown.js'

vi.mock('ajv/dist/jtd.js')
vi.mock('../markdown/frontmatter.js')

type TestValidator = Ajv.ValidateFunction<PieceFrontmatter<PieceSelectable>>

const mocks = {
	addFrontMatter: vi.mocked(addFrontMatter),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/pieces/markdown.ts', () => {
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
		const slug = 'path/to/some-piece.md'
		const note = 'a tale of two mark downs'
		const frontmatter = { title: 'two', metadata: 'three' }
		const validator = () => true

		const md = makePieceMarkdownOrThrow(
			slug,
			note,
			frontmatter,
			validator as unknown as TestValidator
		)

		expect(md).toEqual({
			slug,
			frontmatter,
			note,
		})
	})

	test('makePieceMarkdownOrThrow catches validation error', async () => {
		const slug = 'path/to/some-piece.md'
		const markdown = 'a tale of two mark downs'
		const frontmatter = { title: 'two', metadata: 'three' }
		const validator = () => false

		validator.errors = [{ message: 'some error' }]

		expect(() =>
			makePieceMarkdownOrThrow(slug, markdown, frontmatter, validator as unknown as TestValidator)
		).toThrowError()
	})

	test('makePieceMardownString', () => {
		makePieceMarkdownString(
			{} as unknown as PieceMarkdown<Omit<PieceSelectable, keyof PieceSelectable>>
		)
		expect(mocks.addFrontMatter).toHaveBeenCalled()
	})
})
