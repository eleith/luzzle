import { describe, expect, test, vi, afterEach } from 'vitest'
import {
	PieceFrontmatterSchemaField,
} from './utils/frontmatter.js'
import { makeMarkdownSample, makeSample, makeSchema } from './utils/piece.fixtures.js'
import * as database from './item.js'
import { ValidateFunction } from 'ajv'

describe('src/pieces/item.ts', () => {
	afterEach(() => {
		vi.resetAllMocks()
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
		const schema = makeSchema({
			title: { type: 'string' },
			keywords: { type: 'string' },
			subtitle: { type: 'string' },
		} as any)

		const input = database.makePieceItemInsertable(piece, markdown, schema)

		expect(input).toEqual({
			id: expect.any(String),
			file_path: path,
			note_markdown: markdown.note,
			frontmatter_json: JSON.stringify(frontmatter),
			type: piece,
		})
	})

	test('makePieceItemInsertable with recursive assets', () => {
		const note = 'note'
		const piece = 'books'
		const path = 'path'
		const frontmatter = {
			title: 'title',
			metadata: {
				poster: 'poster.jpg',
				gallery: ['img1.png', 'img2.png'],
				deep: {
					icon: 'icon.svg'
				}
			}
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		
		const schema = makeSchema({
			metadata: {
				type: 'object',
				properties: {
					poster: { type: 'string', format: 'asset' },
					gallery: { type: 'array', items: { type: 'string', format: 'asset' } },
					deep: {
						type: 'object',
						properties: {
							icon: { type: 'string', format: 'asset' }
						}
					}
				}
			}
		} as any)

		const input = database.makePieceItemInsertable(piece, markdown, schema)

		expect(input.assets_json_array).toBeDefined()
		const assets = JSON.parse(input.assets_json_array!)
		expect(assets).toContain('poster.jpg')
		expect(assets).toContain('img1.png')
		expect(assets).toContain('img2.png')
		expect(assets).toContain('icon.svg')
		expect(assets).toHaveLength(4)
	})

	test('makePieceItemInsertable with deep array assets', () => {
		const piece = 'books'
		const frontmatter = {
			title: 'title',
			galleries: [
				['a.jpg', 'b.jpg'],
				['c.jpg']
			]
		}
		const markdown = makeMarkdownSample('path', piece, 'note', frontmatter)
		const schema = makeSchema({
			galleries: {
				type: 'array',
				items: {
					type: 'array',
					items: { type: 'string', format: 'asset' }
				}
			}
		} as any)

		const input = database.makePieceItemInsertable(piece, markdown, schema)
		const assets = JSON.parse(input.assets_json_array!)
		expect(assets).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
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
		const schema = makeSchema({
			title: { type: 'string' },
			keywords: { type: 'string' },
			subtitle: { type: 'string' },
		} as any)

		data.note_markdown = 'old note'

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update).toEqual({
			date_updated: expect.any(Number),
			file_path: path,
			note_markdown: note,
			frontmatter_json: JSON.stringify(frontmatter),
		})
	})

	test('makePieceItemUpdatable with recursive assets', () => {
		const data = makeSample()
		const note = 'note'
		const path = 'path'
		const piece = 'books'
		const frontmatter = {
			title: 'title',
			metadata: {
				poster: 'new-poster.jpg'
			}
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema({
			metadata: {
				type: 'object',
				properties: {
					poster: { type: 'string', format: 'asset' }
				}
			}
		} as any)

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update.assets_json_array).toBe(JSON.stringify(['new-poster.jpg']))
	})

	test('validatePieceItem', () => {
		const note = 'note'
		const piece = 'books'
		const path = 'path'
		const frontmatter = {
			title: 'title',
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const validator = vi.fn(() => true) as unknown as ValidateFunction<typeof frontmatter>

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
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const validator = vi.fn(() => false) as unknown as ValidateFunction<typeof frontmatter>

		const valid = database.validatePieceItem(markdown, validator)

		expect(valid).toBe(false)
		expect(validator).toHaveBeenCalledOnce()
	})

	test('getValidatePieceItemErrors', () => {
		const errors = [{ instancePath: '/title', message: 'is required' }]
		const validator = { errors } as unknown as ValidateFunction<any>
		const getErrors = database.getValidatePieceItemErrors(validator)

		expect(getErrors[0]).toContain('/title is required')
	})
})
