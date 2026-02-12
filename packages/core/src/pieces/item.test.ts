import { describe, expect, test, vi, afterEach } from 'vitest'
import { makeMarkdownSample, makePieceItemSelectable, makeSchema } from './Piece.fixtures.js'
import * as database from './item.js'
import { ValidateFunction } from 'ajv'
import { PieceFrontmatter } from './utils/frontmatter.js'

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
		})

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
		})

		const input = database.makePieceItemInsertable(piece, markdown, schema)

		expect(input.assets_json_array).toBeDefined()
		const assets = JSON.parse(input.assets_json_array!)
		expect(assets).toContain('poster.jpg')
		expect(assets).toContain('img1.png')
		expect(assets).toContain('img2.png')
		expect(assets).toContain('icon.svg')
		expect(assets).toHaveLength(4)
	})

	test('makePieceItemInsertable with array of objects containing assets', () => {
		const piece = 'books'
		const frontmatter = {
			title: 'title',
			items: [
				{ image: 'a.jpg' },
				{ image: 'b.jpg' }
			]
		}
		const markdown = makeMarkdownSample('path', piece, 'note', frontmatter)
		const schema = makeSchema({
			items: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						image: { type: 'string', format: 'asset' }
					}
				}
			}
		})

		const input = database.makePieceItemInsertable(piece, markdown, schema)
		expect(input.assets_json_array).toBe(JSON.stringify(['a.jpg', 'b.jpg']))
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
		})

		const input = database.makePieceItemInsertable(piece, markdown, schema)
		const assets = JSON.parse(input.assets_json_array!)
		expect(assets).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
	})

	test('makePieceItemUpdatable', () => {
		const data = makePieceItemSelectable()
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
		})

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
		const data = makePieceItemSelectable()
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
		})

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update.assets_json_array).toBe(JSON.stringify(['new-poster.jpg']))
	})

	test('makePieceItemUpdatable with asset changes but no frontmatter change', () => {
		const data = makePieceItemSelectable()
		const note = 'note'
		const path = data.file_path
		const piece = 'books'
		const frontmatter = { title: 'title', poster: 'new.jpg' }
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema({
			poster: { type: 'string', format: 'asset' }
		})

		data.frontmatter_json = JSON.stringify({ title: 'title' })
		data.assets_json_array = JSON.stringify(['old.jpg'])

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update.assets_json_array).toBe(JSON.stringify(['new.jpg']))
		expect(update.frontmatter_json).toBeDefined()
	})

	test('makePieceItemUpdatable with force and new path', () => {
		const data = makePieceItemSelectable()
		const note = 'note'
		const path = 'new-path'
		const piece = 'books'
		const frontmatter = { title: 'title' }
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema({})

		const update = database.makePieceItemUpdatable(markdown, schema, data, true)

		expect(update.file_path).toBe(path)
	})

	test('makePieceItemUpdatable with same path and no force', () => {
		const data = makePieceItemSelectable()
		const note = 'note'
		const path = data.file_path
		const piece = 'books'
		const frontmatter = { title: 'title' }
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const schema = makeSchema({})

		const update = database.makePieceItemUpdatable(markdown, schema, data)

		expect(update.file_path).toBeUndefined()
	})

	test('validatePieceItem', () => {
		const note = 'note'
		const piece = 'books'
		const path = 'path'
		const frontmatter = {
			title: 'title',
		}
		const markdown = makeMarkdownSample(path, piece, note, frontmatter)
		const validator = vi.fn(() => true) as unknown as ValidateFunction<PieceFrontmatter>

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
		const validator = vi.fn(() => false) as unknown as ValidateFunction<PieceFrontmatter>

		const valid = database.validatePieceItem(markdown, validator)

		expect(valid).toBe(false)
		expect(validator).toHaveBeenCalledOnce()
	})

	test('getValidatePieceItemErrors', () => {
		const errors = [{ instancePath: '/title', message: 'is required' }]
		const validator = { errors } as unknown as ValidateFunction<PieceFrontmatter>
		const getErrors = database.getValidatePieceItemErrors(validator)

		expect(getErrors[0]).toContain('/title is required')
	})
})
