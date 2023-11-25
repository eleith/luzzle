import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import * as pieceMarkdown from './markdown.js'
import Ajv from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../md.js'
import { PieceSelectable, PieceMarkdown } from '@luzzle/kysely'

vi.mock('../md')
vi.mock('ajv/dist/jtd.js')
vi.mock('./piece')

type TestValidator = Ajv.ValidateFunction<PieceMarkdown<PieceSelectable>>

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
		const markdown = 'a tale of two mark downs'
		const frontmatter = { title: 'two', metadata: 'three' }
		const validator = () => true

		const md = pieceMarkdown.toValidatedMarkDown(
			slug,
			markdown,
			frontmatter,
			validator as unknown as TestValidator
		)

		expect(md).toEqual({
			slug,
			frontmatter,
			markdown,
		})
	})

	test('toValidatedMarkDown catches validation error', async () => {
		const slug = 'path/to/some-piece.md'
		const markdown = 'a tale of two mark downs'
		const frontmatter = { title: 'two', metadata: 'three' }
		const validator = () => false

		validator.errors = [{ message: 'some error' }]

		expect(() =>
			pieceMarkdown.toValidatedMarkDown(
				slug,
				markdown,
				frontmatter,
				validator as unknown as TestValidator
			)
		).toThrowError()
	})

	test('toMarkDownString', () => {
		pieceMarkdown.toMarkDownString({} as unknown as PieceMarkdown<PieceSelectable>)
		expect(mocks.addFrontMatter).toHaveBeenCalled()
	})
})
