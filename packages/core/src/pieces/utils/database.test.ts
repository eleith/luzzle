import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { getPieceFrontmatterKeysFromSchema, unformatPieceFrontmatterValue } from './frontmatter.js'
import { makeMarkdownSample, makeSample, makeSchema } from './piece.fixtures.js'
import * as database from './database.js'

vi.mock('./frontmatter.js')

const mocks = {
	getPieceFrontmatterKeysFromSchema: vi.mocked(getPieceFrontmatterKeysFromSchema),
	unformatPieceFrontmatterValue: vi.mocked(unformatPieceFrontmatterValue),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/pieces/database.ts', () => {
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
		const date = new Date()
		const frontmatter = {
			date: date.toISOString(),
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const schema = makeSchema()

		mocks.getPieceFrontmatterKeysFromSchema.mockReturnValueOnce([
			{ name: 'date', type: 'string', metadata: { format: 'date-string' } },
		])
		mocks.unformatPieceFrontmatterValue.mockImplementation((value) => new Date(value as string))

		const input = database.makePieceInsertable(markdown, schema)

		expect(mocks.unformatPieceFrontmatterValue).toHaveBeenCalledWith(
			frontmatter.date,
			'date-string'
		)
		expect(input).toEqual({
			id: expect.any(String),
			slug: markdown.slug,
			note: markdown.note,
			date: date,
		})
	})

	test('makePieceInsertable handles arrays', () => {
		const slug = 'slug'
		const note = 'note'
		const frontmatter = {
			stuff: ['a', 'b'],
			badstuff: 'a',
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const schema = makeSchema()

		mocks.getPieceFrontmatterKeysFromSchema.mockReturnValueOnce([
			{ name: 'stuff', type: 'string', collection: 'array' },
			{ name: 'badstuff', type: 'string', collection: 'array' },
		])
		mocks.unformatPieceFrontmatterValue.mockImplementation((value) => value)

		const input = database.makePieceInsertable(markdown, schema)

		expect(input).toEqual({
			id: expect.any(String),
			slug: markdown.slug,
			note: markdown.note,
			stuff: JSON.stringify(frontmatter.stuff),
		})
	})

	test('makePieceUpdatable', () => {
		const data = makeSample()
		const slug = 'slug'
		const note = 'note'
		const frontmatter = {
			stuff: ['a', 'b'],
			title: 'title',
			hidden: 'hidden',
			date: new Date().toISOString(),
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const schema = makeSchema()

		data.subtitle = 'no subtitle'
		data.title = frontmatter.title
		data.slug = slug
		data.note = note
		data.keywords = 'keys'

		mocks.getPieceFrontmatterKeysFromSchema.mockReturnValueOnce([
			{ name: 'title', type: 'string' },
			{ name: 'subtitle', type: 'string' },
			{ name: 'stuff', type: 'string', collection: 'array' },
			{ name: 'date', type: 'string', metadata: { format: 'date-string' } },
			{ name: 'keywords', type: 'string' },
		])
		mocks.unformatPieceFrontmatterValue.mockImplementation((value) =>
			value !== undefined ? value : null
		)

		const update = database.makePieceUpdatable(markdown, schema, data)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			stuff: JSON.stringify(frontmatter.stuff),
			date: frontmatter.date,
			subtitle: frontmatter.subtitle,
			keywords: null,
		})
	})

	test('makePieceUpdatable updates note and slug', () => {
		const data = makeSample()
		const slug = 'slug'
		const note = 'note'
		const frontmatter = {
			title: 'title',
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const schema = makeSchema()

		data.title = frontmatter.title
		data.slug = 'old slug'
		data.note = 'old note'

		mocks.getPieceFrontmatterKeysFromSchema.mockReturnValueOnce([{ name: 'title', type: 'string' }])
		mocks.unformatPieceFrontmatterValue.mockImplementation((value) => value)

		const update = database.makePieceUpdatable(markdown, schema, data)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			note,
			slug,
		})
	})
})
