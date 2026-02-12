import { describe, expect, test, vi, afterEach } from 'vitest'
import * as frontmatter from './frontmatter.js'
import { makeSchema, MockSchemaProperty } from '../Piece.fixtures.js'

describe('pieces/utils/frontmatter.ts', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	describe('getPieceFrontmatterSchemaFields', () => {
		test('handles basic scalar fields', () => {
			const schema = makeSchema({
				field: { type: 'string' },
				field2: { type: 'string', nullable: true, format: 'date', pattern: 'pattern' } as unknown as MockSchemaProperty,
			})
			const fields = frontmatter.getPieceFrontmatterSchemaFields(schema)

			expect(fields).toContainEqual({ name: 'field', type: 'string', nullable: true })
			expect(fields).toContainEqual({
				name: 'field2',
				type: 'string',
				format: 'date',
				pattern: 'pattern',
				nullable: true,
			})
		})

		test('handles required and nullable fields', () => {
			const schema = makeSchema({
				requiredField: { type: 'string' },
				optionalField: { type: 'string', nullable: true },
			})
			schema.required = ['requiredField']
			const fields = frontmatter.getPieceFrontmatterSchemaFields(schema)

			const requiredField = fields.find((f) => f.name === 'requiredField')
			const optionalField = fields.find((f) => f.name === 'optionalField')

			expect(optionalField?.nullable).toBe(true)
			expect(requiredField?.nullable).toBe(false)
		})
	})

	describe('pieceFrontmatterValueToDatabaseValue', () => {
		test('converts basic scalars', () => {
			expect(
				frontmatter.pieceFrontmatterValueToDatabaseValue('2021-01-01', {
					format: 'date',
					type: 'string',
				} as unknown as frontmatter.PieceFrontmatterProperty)
			).toBeTypeOf('number')

			expect(frontmatter.pieceFrontmatterValueToDatabaseValue(true, { type: 'boolean' })).toBe(1)
			expect(frontmatter.pieceFrontmatterValueToDatabaseValue(false, { type: 'boolean' })).toBe(0)
			expect(frontmatter.pieceFrontmatterValueToDatabaseValue(10, { type: 'integer' })).toBe(10)
		})

		test('handles null and undefined', () => {
			const prop: frontmatter.PieceFrontmatterProperty = { type: 'string' }
			expect(frontmatter.pieceFrontmatterValueToDatabaseValue(null, prop)).toBe(null)
			expect(frontmatter.pieceFrontmatterValueToDatabaseValue(undefined, prop)).toBe(null)
		})

		test('handles unknown field type', () => {
			const prop = { type: 'unknown' } as unknown as frontmatter.PieceFrontmatterProperty
			expect(frontmatter.pieceFrontmatterValueToDatabaseValue('val', prop)).toBe('val')
		})

		test('handles default string type', () => {
			const prop: frontmatter.PieceFrontmatterProperty = { type: 'string' }
			expect(frontmatter.pieceFrontmatterValueToDatabaseValue('val', prop)).toBe('val')
		})

		test('converts comma-separated format', () => {
			const prop: frontmatter.PieceFrontmatterProperty = {
				type: 'string',
				format: 'comma-separated',
			}
			expect(frontmatter.pieceFrontmatterValueToDatabaseValue('a,b', prop)).toBe('["a","b"]')
		})

		test('converts arrays to native arrays (not CSV)', () => {
			const prop: frontmatter.PieceFrontmatterProperty = {
				type: 'array',
				items: { type: 'string' },
			}
			const value = ['a', 'b,withComma']
			const result = frontmatter.pieceFrontmatterValueToDatabaseValue(value, prop)

			expect(result).toEqual(['a', 'b,withComma'])
			expect(result).not.toBe('a,b,withComma')
		})

		test('converts objects recursively', () => {
			const prop: frontmatter.PieceFrontmatterProperty = {
				type: 'object',
				properties: {
					date: { type: 'string', format: 'date' } as unknown as frontmatter.PieceFrontmatterProperty,
				},
			}
			const value = { date: '2023-01-01', extra: 'keep-me' }
			const result = frontmatter.pieceFrontmatterValueToDatabaseValue(value, prop) as Record<
				string,
				unknown
			>

			expect(result.date).toBeTypeOf('number')
			expect(result.extra).toBe('keep-me')
		})
	})

	describe('databaseValueToPieceFrontmatterValue', () => {
		test('restores basic scalars', () => {
			expect(
				frontmatter.databaseValueToPieceFrontmatterValue(1609459200000, {
					format: 'date',
					type: 'string',
				} as unknown as frontmatter.PieceFrontmatterProperty)
			).toBeTypeOf('string')

			expect(frontmatter.databaseValueToPieceFrontmatterValue(1, { type: 'boolean' })).toBe(true)
		})

		test('restores integers', () => {
			const prop: frontmatter.PieceFrontmatterProperty = { type: 'integer' }
			expect(frontmatter.databaseValueToPieceFrontmatterValue('10', prop)).toBe(10)
		})

		test('restores arrays from native arrays', () => {
			const prop: frontmatter.PieceFrontmatterProperty = {
				type: 'array',
				items: { type: 'string' },
			}
			const value = ['a', 'b,withComma']
			expect(frontmatter.databaseValueToPieceFrontmatterValue(value, prop)).toEqual(value)
		})

		test('restores arrays from legacy CSV strings', () => {
			const prop: frontmatter.PieceFrontmatterProperty = {
				type: 'array',
				items: { type: 'string' },
			}
			const value = 'a,b'
			expect(frontmatter.databaseValueToPieceFrontmatterValue(value, prop)).toEqual(['a', 'b'])
		})

		test('restores objects recursively', () => {
			const prop: frontmatter.PieceFrontmatterProperty = {
				type: 'object',
				properties: {
					date: { type: 'string', format: 'date' } as unknown as frontmatter.PieceFrontmatterProperty,
				},
			}
			const value = { date: 1672531200000, extra: 'prop' }
			const result = frontmatter.databaseValueToPieceFrontmatterValue(value, prop) as Record<
				string,
				unknown
			>

			expect(typeof result.date).toBe('string')
			expect(result.extra).toBe('prop')
		})

		test('handles null and undefined', () => {
			const prop: frontmatter.PieceFrontmatterProperty = { type: 'string' }
			expect(frontmatter.databaseValueToPieceFrontmatterValue(null, prop)).toBe(null)
			expect(frontmatter.databaseValueToPieceFrontmatterValue(undefined, prop)).toBe(null)
		})

		test('handles non-json comma-separated strings', () => {
			const prop: frontmatter.PieceFrontmatterProperty = {
				type: 'string',
				format: 'comma-separated',
			}
			expect(frontmatter.databaseValueToPieceFrontmatterValue('invalid', prop)).toBe('invalid')
		})

		test('handles default string type', () => {
			const prop: frontmatter.PieceFrontmatterProperty = { type: 'string' }
			expect(frontmatter.databaseValueToPieceFrontmatterValue('val', prop)).toBe('val')
		})

		test('handles unknown field type', () => {
			const prop = { type: 'unknown' } as unknown as frontmatter.PieceFrontmatterProperty
			expect(frontmatter.databaseValueToPieceFrontmatterValue('val', prop)).toBe('val')
		})
	})

	describe('initializePieceFrontMatter', () => {
		test('initializes nested objects', () => {
			const schema = {
				type: 'object',
				properties: {
					title: { type: 'string', examples: ['title'] },
					metadata: {
						type: 'object',
						properties: {
							author: { type: 'string', examples: ['Author'] },
						},
						required: ['author'],
					},
				},
				required: ['title', 'metadata'],
			} as unknown as frontmatter.PieceFrontmatterSchema<frontmatter.PieceFrontmatter>

			const front = frontmatter.initializePieceFrontMatter(schema)
			expect(front).toEqual({
				title: 'title',
				metadata: { author: 'Author' },
			})
		})

		test('initializes empty object if required but no subfields initialized', () => {
			const properties: Record<string, MockSchemaProperty> = {
				metadata: {
					type: 'object',
					properties: {
						author: { type: 'string' },
					},
				},
			}
			const schema = makeSchema(properties)
			schema.required = ['title', 'metadata']

			const front = frontmatter.initializePieceFrontMatter(schema, true)
			expect(front).toEqual({ title: 'title', metadata: {} })
		})

		test('honors minimal flag recursively', () => {
			const schema = {
				type: 'object',
				properties: {
					title: { type: 'string', examples: ['title'] },
					metadata: {
						type: 'object',
						properties: {
							author: { type: 'string', examples: ['Author'] },
						},
					},
				},
				required: ['title'],
			} as unknown as frontmatter.PieceFrontmatterSchema<frontmatter.PieceFrontmatter>

			const front = frontmatter.initializePieceFrontMatter(schema, true)
			expect(front).toEqual({ title: 'title' })
		})

		test('fails if required field has no initial value', () => {
			const schema = {
				type: 'object',
				properties: {
					title: { type: 'string' },
				},
				required: ['title'],
			} as unknown as frontmatter.PieceFrontmatterSchema<frontmatter.PieceFrontmatter>

			expect(() => frontmatter.initializePieceFrontMatter(schema)).toThrow(
				'can not initialize field "title"'
			)
		})
	})
})
