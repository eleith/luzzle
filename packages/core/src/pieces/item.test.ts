import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import {
	getPieceFrontmatterSchemaFields,
	PieceFrontmatterSchemaField,
	pieceFrontmatterValueToDatabaseValue,
} from './utils/frontmatter.js'
import { makeMarkdownSample, makeSample, makeSchema } from './utils/piece.fixtures.js'
import * as database from './item.js'

vi.mock('./utils/frontmatter.js')

const mocks = {
	getPieceFrontmatterSchemaFields: vi.mocked(getPieceFrontmatterSchemaFields),
	pieceFrontmatterValueToDatabaseValue: vi.mocked(pieceFrontmatterValueToDatabaseValue),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/pieces/item.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('makePieceItemInsertable', () => {
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

		const input = database.makePieceItemInsertable(markdown, schema)

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

	test('makePieceItemUpdatable', () => {
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

		data.title = frontmatter.title
		data.keywords = frontmatter.keywords
		data.subtitle = frontmatter.subtitle
		data.note = 'old note'
		data.slug = 'old slug'

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			note,
			slug,
		})
	})

	test('makePieceItemUpdatable force', () => {
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

		data.title = frontmatter.title
		data.keywords = frontmatter.keywords
		data.subtitle = frontmatter.subtitle
		data.note = 'old note'
		data.slug = 'old slug'

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const update = database.makePieceItemUpdatable(markdown, schema, data, true)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			note,
			slug,
			...frontmatter,
		})
	})
})
