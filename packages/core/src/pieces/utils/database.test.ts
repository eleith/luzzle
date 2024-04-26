import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import {
	getPieceFrontmatterSchemaFields,
	PieceFrontmatterSchemaField,
	pieceFrontmatterValueToDatabaseValue,
} from './frontmatter.js'
import { makeMarkdownSample, makeSample, makeSchema } from './piece.fixtures.js'
import * as database from './database.js'

vi.mock('./frontmatter.js')

const mocks = {
	getPieceFrontmatterSchemaFields: vi.mocked(getPieceFrontmatterSchemaFields),
	pieceFrontmatterValueToDatabaseValue: vi.mocked(pieceFrontmatterValueToDatabaseValue),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/pieces/utils/database.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('makePieceInsertable', () => {
		const slug = 'slug'
		const note = 'note'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const schema = makeSchema()
		const fields = [
			{ name: 'title', type: 'string' },
			{ name: 'keywords', type: 'string' },
			{ name: 'subtitle', type: 'string' },
		] as Array<PieceFrontmatterSchemaField>

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const input = database.makePieceInsertable(markdown, schema)

		expect(mocks.pieceFrontmatterValueToDatabaseValue).toHaveBeenCalledTimes(
			Object.keys(frontmatter).length
		)
		expect(input).toEqual({
			id: expect.any(String),
			slug: markdown.slug,
			note: markdown.note,
			...frontmatter,
		})
	})

	test('makePieceUpdatable', () => {
		const data = makeSample()
		const slug = 'slug'
		const note = 'note'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const schema = makeSchema()
		const fields = [
			{ name: 'title', type: 'string' },
			{ name: 'keywords', type: 'string' },
			{ name: 'subtitle', type: 'string' },
		] as Array<PieceFrontmatterSchemaField>

		data.subtitle = 'no subtitle'
		data.title = frontmatter.title
		data.keywords = frontmatter.keywords
		data.note = 'old note'
		data.slug = 'old slug'

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const update = database.makePieceUpdatable(markdown, schema, data)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			subtitle: frontmatter.subtitle,
			note,
			slug,
		})
	})
})
