import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { PieceMarkdown, toMarkdownString, toValidatedMarkdown } from './markdown.js'
import Ajv from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../md.js'
import { PieceFrontmatter, PieceSelectable } from '@luzzle/kysely'

vi.mock('../md')
vi.mock('ajv/dist/jtd.js')
vi.mock('./piece')

type TestValidator = Ajv.ValidateFunction<
	PieceFrontmatter<Omit<PieceSelectable, keyof PieceSelectable>>
>

const mocks = {
	addFrontMatter: vi.mocked(addFrontMatter),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/pieces/markdown', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('toValidatedMarkDown', async () => {
		const slug = 'path/to/some-piece.md'
		const note = 'a tale of two mark downs'
		const frontmatter = { title: 'two', metadata: 'three' }
		const validator = () => true

		const md = toValidatedMarkdown(slug, note, frontmatter, validator as unknown as TestValidator)

		expect(md).toEqual({
			slug,
			frontmatter,
			note,
		})
	})

	test('toValidatedMarkDown catches validation error', async () => {
		const slug = 'path/to/some-piece.md'
		const markdown = 'a tale of two mark downs'
		const frontmatter = { title: 'two', metadata: 'three' }
		const validator = () => false

		validator.errors = [{ message: 'some error' }]

		expect(() =>
			toValidatedMarkdown(slug, markdown, frontmatter, validator as unknown as TestValidator)
		).toThrowError()
	})

	test('toMarkdownString', () => {
		toMarkdownString({} as unknown as PieceMarkdown<Omit<PieceSelectable, keyof PieceSelectable>>)
		expect(mocks.addFrontMatter).toHaveBeenCalled()
	})
})
