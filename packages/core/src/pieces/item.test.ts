import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import {
	getPieceFrontmatterSchemaFields,
	PieceFrontmatter,
	PieceFrontmatterSchemaField,
	pieceFrontmatterValueToDatabaseValue,
} from './utils/frontmatter.js'
import { makeMarkdownSample, makeSample, makeSchema } from './utils/piece.fixtures.js'
import * as database from './item.js'
import Ajv from 'ajv'

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
		const note = 'note'
		const piece = 'books'
		const path = 'path'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema()
		const fields = [
			{ name: 'title', type: 'string' },
			{ name: 'keywords', type: 'string' },
			{ name: 'subtitle', type: 'string' },
		] as Array<PieceFrontmatterSchemaField>

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const input = database.makePieceItemInsertable(piece, markdown, schema)

		expect(mocks.pieceFrontmatterValueToDatabaseValue).toHaveBeenCalledTimes(
			Object.keys(frontmatter).length
		)
		expect(input).toEqual({
			id: expect.any(String),
			file_path: path,
			note_markdown: markdown.note,
			frontmatter_json: JSON.stringify(frontmatter),
			type: piece,
		})
	})

	test('makePieceItemInsertable with assets', () => {
		const note = 'note'
		const piece = 'books'
		const path = 'path'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
			poster: 'poster.jpg',
			images: ['image1.jpg', 'image2.jpg'],
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema()
		const fields = [
			{ name: 'title', type: 'string' },
			{ name: 'keywords', type: 'string' },
			{ name: 'subtitle', type: 'string' },
			{ name: 'poster', format: 'asset' },
			{ name: 'images', type: 'array', format: 'asset' },
		] as Array<PieceFrontmatterSchemaField>

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const input = database.makePieceItemInsertable(piece, markdown, schema)

		expect(mocks.pieceFrontmatterValueToDatabaseValue).toHaveBeenCalledTimes(
			Object.keys(frontmatter).length
		)
		expect(input).toEqual({
			id: expect.any(String),
			file_path: path,
			note_markdown: markdown.note,
			frontmatter_json: JSON.stringify(frontmatter),
			type: piece,
			assets_json_array: JSON.stringify([frontmatter.poster, ...frontmatter.images]),
		})
	})

	test('makePieceItemUpdatable', () => {
		const data = makeSample()
		const note = 'note'
		const path = 'path'
		const piece = 'books'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema()
		const fields = [
			{ name: 'title', type: 'string' },
			{ name: 'keywords', type: 'string' },
			{ name: 'subtitle', type: 'string' },
		] as Array<PieceFrontmatterSchemaField>

		data.note_markdown = 'old note'

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			file_path: path,
			note_markdown: note,
			frontmatter_json: JSON.stringify(frontmatter),
		})
	})

	test('makePieceItemUpdatable with assets', () => {
		const data = makeSample()
		const note = 'note'
		const path = 'path'
		const piece = 'books'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
			poster: 'poster.jpg',
			images: ['image1.jpg', 'image2.jpg'],
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema()
		const fields = [
			{ name: 'title', type: 'string' },
			{ name: 'keywords', type: 'string' },
			{ name: 'subtitle', type: 'string' },
			{ name: 'poster', format: 'asset' },
			{ name: 'images', type: 'array', format: 'asset' },
		] as Array<PieceFrontmatterSchemaField>

		data.note_markdown = 'old note'

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			file_path: path,
			note_markdown: note,
			frontmatter_json: JSON.stringify(frontmatter),
			assets_json_array: JSON.stringify([frontmatter.poster, ...frontmatter.images]),
		})
	})

	test('makePieceItemUpdatable force', () => {
		const data = makeSample()
		const note = 'note'
		const path = 'path'
		const piece = 'books'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema()
		const fields = [
			{ name: 'title', type: 'string' },
			{ name: 'keywords', type: 'string' },
			{ name: 'subtitle', type: 'string' },
		] as Array<PieceFrontmatterSchemaField>

		data.note_markdown = 'old note'
		data.frontmatter_json = JSON.stringify(frontmatter)

		mocks.getPieceFrontmatterSchemaFields.mockReturnValueOnce(fields)
		mocks.pieceFrontmatterValueToDatabaseValue.mockImplementation((value) => value)

		const update = database.makePieceItemUpdatable(markdown, schema, data, true)

		expect(update).toEqual({
			file_path: path,
			date_updated: expect.any(Number),
			note_markdown: note,
			frontmatter_json: JSON.stringify(frontmatter),
			assets_json_array: undefined,
		})
	})

	test('validatePieceItem', () => {
		const note = 'note'
		const piece = 'books'
		const path = 'path'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const validator = vi.fn(() => true) as unknown as Ajv.ValidateFunction<typeof frontmatter>

		const valid = database.validatePieceItem(markdown, validator)

		expect(valid).toBe(true)
		expect(validator).toHaveBeenCalledOnce()
	})

	test('validatePieceItem fails', () => {
		const note = 'note'
		const piece = 'books'
		const path = 'path'
		const frontmatter = {
			title: 'title',
			keywords: 'keys',
			subtitle: 'subtitle',
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const validator = vi.fn(() => false) as unknown as Ajv.ValidateFunction<typeof frontmatter>

		const valid = database.validatePieceItem(markdown, validator)

		expect(valid).toBe(false)
		expect(validator).toHaveBeenCalledOnce()
	})

	test('getValidatePieceItemErrors', () => {
		const errors = ['errors', 'errors', 'errors']
		const validator = { errors } as unknown as Ajv.ValidateFunction<PieceFrontmatter>
		const getErrors = database.getValidatePieceItemErrors(validator)

		expect(getErrors).length(errors.length)
	})

	test('getValidatePieceItemErrors but on valid validator', () => {
		const validator = { errors: undefined } as unknown as Ajv.ValidateFunction<PieceFrontmatter>
		const getErrors = database.getValidatePieceItemErrors(validator)

		expect(getErrors).length(0)
	})
})
