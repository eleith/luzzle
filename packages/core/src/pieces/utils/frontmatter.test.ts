import { describe, expect, test, vi, afterEach } from 'vitest'
import * as frontmatter from './frontmatter.js'
import { makeSchema } from './piece.fixtures.js'

describe('src/pieces/utils/frontmatter.ts', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	test('getPieceFrontmatterSchemaFields', () => {
		const schema = makeSchema({
			field: { type: 'string' },
			field2: { type: 'string', nullable: true, format: 'date', pattern: 'pattern' },
		})
		const fields = frontmatter.getPieceFrontmatterSchemaFields(schema)

		expect(fields).toContainEqual({ name: 'field', type: 'string' })
		expect(fields).toContainEqual({
			name: 'field2',
			type: 'string',
			format: 'date',
			pattern: 'pattern',
			nullable: true,
		})
	})

	test('pieceFrontmatterValueToDatabaseValue', () => {
		const date = frontmatter.pieceFrontmatterValueToDatabaseValue('2021-01-01', {
			format: 'date',
			type: 'string',
			name: 'date',
		})
		const one = frontmatter.pieceFrontmatterValueToDatabaseValue(true, {
			type: 'boolean',
			name: 'bool',
		})
		const zero = frontmatter.pieceFrontmatterValueToDatabaseValue(false, {
			type: 'boolean',
			name: 'bool',
		})
		const list = frontmatter.pieceFrontmatterValueToDatabaseValue(['a', 'b'], {
			type: 'array',
			name: 'list',
			items: { type: 'string' },
		})
		const nil = frontmatter.pieceFrontmatterValueToDatabaseValue(undefined, {
			name: 'something',
			type: 'string',
		})
		const ten = frontmatter.pieceFrontmatterValueToDatabaseValue(10, {
			name: 'something',
			type: 'integer',
		})

		expect(date).toBeTypeOf('number')
		expect(one).toBe(1)
		expect(zero).toBe(0)
		expect(list).toBe('a,b')
		expect(nil).toBe(null)
		expect(ten).toBe(10)
	})

	test('databaseValueToPieceFrontMatterValue', () => {
		const dateString = '12/31/2021'
		const date = frontmatter.databaseValueToPieceFrontmatterValue(new Date(dateString).getTime(), {
			format: 'date',
			type: 'string',
			name: 'date',
		})
		const one = frontmatter.databaseValueToPieceFrontmatterValue(1, {
			type: 'boolean',
			name: 'bool',
		})
		const zero = frontmatter.databaseValueToPieceFrontmatterValue(0, {
			type: 'boolean',
			name: 'bool',
		})
		const list = frontmatter.databaseValueToPieceFrontmatterValue('a,b', {
			type: 'array',
			name: 'list',
			items: { type: 'string' },
		})

		expect(date).toBe(dateString)
		expect(one).toBe(true)
		expect(zero).toBe(false)
		expect(list).toEqual(['a', 'b'])
	})

	test('initializePieceFrontMatter', () => {
		const schema = {
			type: 'object',
			properties: {
				title: { type: 'string', examples: ['title'] },
				keywords: { type: 'string', examples: ['keyword1'], nullable: true },
				subtitle: { type: 'string', examples: ['subtitle'], nullable: true },
			},
			required: ['title'],
			additionalProperties: true,
		} as frontmatter.PieceFrontmatterSchema<{ title: string; keywords?: string; subtitle?: string }>

		const front = frontmatter.initializePieceFrontMatter(schema)

		expect(front).toEqual({
			title: 'title',
			keywords: 'keyword1',
			subtitle: 'subtitle',
		})
	})

	test('initializePieceFrontMatter with minimal examples', () => {
		const schema = {
			type: 'object',
			properties: {
				title: { type: 'string', examples: ['title'] },
				keywords: { type: 'string', examples: ['keyword1'], nullable: true },
				subtitle: { type: 'string', examples: ['subtitle'], nullable: true },
			},
			required: ['title'],
			additionalProperties: true,
		} as frontmatter.PieceFrontmatterSchema<{ title: string; keywords?: string; subtitle?: string }>

		const front = frontmatter.initializePieceFrontMatter(schema, true)

		expect(front).toEqual({
			title: 'title',
		})
	})

	test('initializePieceFrontMatter fails on required field with no examples', () => {
		const schema = {
			type: 'object',
			properties: {
				title: { type: 'string' },
			},
			required: ['title'],
			additionalProperties: true,
		} as frontmatter.PieceFrontmatterSchema<{ title: string }>

		expect(() => frontmatter.initializePieceFrontMatter(schema)).toThrow()
	})
})
