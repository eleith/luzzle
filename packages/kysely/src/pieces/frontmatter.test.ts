import { describe, expect, test, vi, afterEach } from 'vitest'
import * as frontmatter from './frontmatter.js'
import { makeSchema } from './piece.fixtures.js'

describe('src/pieces/frontmatter.ts', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	test('getPieceFrontmatterKeysFromSchema sets required', () => {
		const schema = makeSchema({ field: { type: 'string' } }, { field2: { type: 'string' } })
		const keys = frontmatter.getPieceFrontmatterKeysFromSchema(schema)

		expect(keys.find(({ name }) => name === 'field')).toMatchObject({
			name: 'field',
			type: 'string',
			required: true,
		})

		expect(keys.find(({ name }) => name === 'field')).toMatchObject({
			name: 'field',
			type: 'string',
		})
	})

	test('getPieceFrontmatterKeysFromSchema sets nullable', () => {
		const schema = makeSchema({
			field: {
				type: 'string',
				nullable: false,
			},
			fieldEnum: {
				enum: ['a', 'b'],
				nullable: false,
			},
			fieldProperties: {
				properties: {
					subfield: { type: 'string' },
				},
				nullable: false,
			},
			fieldElements: {
				elements: {
					type: 'string',
					nullable: false,
				},
			},
		})
		const keys = frontmatter.getPieceFrontmatterKeysFromSchema(schema)
		const fieldNames = ['field', 'fieldEnum', 'fieldProperties', 'fieldElements']

		fieldNames.forEach((fieldName) => {
			expect(keys.find(({ name }) => name === fieldName)).toMatchObject({
				nullable: false,
			})
		})
	})

	test('getPieceFrontmatterKeysFromSchema sets metadata', () => {
		const schema = makeSchema({
			field: {
				type: 'string',
				metadata: { luzzleFormat: 'f', luzzlePattern: 'x', luzzleEnum: ['a'] },
			},
			fieldElements: {
				elements: {
					type: 'string',
					metadata: { luzzleFormat: 'f', luzzlePattern: 'x', luzzleEnum: ['a'] },
				},
			},
		})

		const keys = frontmatter.getPieceFrontmatterKeysFromSchema(schema)

		expect(keys.find(({ name }) => name === 'field')).toMatchObject({
			metadata: { format: 'f', pattern: 'x', enum: ['a'] },
		})

		expect(keys.find(({ name }) => name === 'fieldElements')).toMatchObject({
			name: 'fieldElements',
			collection: 'array',
			metadata: { format: 'f', pattern: 'x', enum: ['a'] },
		})
	})

	test('getPieceFrontmatterKeysFromSchema throws', () => {
		const schema = makeSchema({
			fieldError: {
				//
			},
		})

		expect(() => frontmatter.getPieceFrontmatterKeysFromSchema(schema)).toThrow()
	})

	test('unformatPieceFrontmatterValue boolean-int', () => {
		const date = frontmatter.unformatPieceFrontmatterValue('2021-01-01', 'date-string')
		const one = frontmatter.unformatPieceFrontmatterValue(true, 'boolean-int')
		const zero = frontmatter.unformatPieceFrontmatterValue(false, 'boolean-int')
		const any = frontmatter.unformatPieceFrontmatterValue('any')

		expect(date).toBeTypeOf('number')
		expect(one).toBe(1)
		expect(zero).toBe(0)
		expect(any).toBe('any')
	})

	test('formatPieceFrontmatterValue boolean-int', () => {
		const dateString = '12/31/2021'
		const date = frontmatter.formatPieceFrontmatterValue(
			new Date(dateString).getTime(),
			'date-string'
		)
		const one = frontmatter.formatPieceFrontmatterValue(1, 'boolean-int')
		const zero = frontmatter.formatPieceFrontmatterValue(0, 'boolean-int')
		const any = frontmatter.formatPieceFrontmatterValue('any')

		expect(date).toBe(dateString)
		expect(one).toBe(true)
		expect(zero).toBe(false)
		expect(any).toBe('any')
	})

	test('initializePieceFrontMatter', () => {
		const schema = makeSchema(
			{
				fieldString: { type: 'string' },
				fieldBoolean: { type: 'boolean' },
				fieldNumber: { type: 'uint32' },
				fieldArrayString: { elements: { type: 'string' } },
				fieldEnum: { enum: ['a', 'b'] },
				fieldDate: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
				fieldDateArray: { elements: { type: 'string', metadata: { luzzleFormat: 'date-string' } } },
			},
			{ fieldOptional: { type: 'string' } }
		)
		const front = frontmatter.initializePieceFrontMatter(schema)

		expect(front).toMatchObject({
			fieldString: '',
			fieldBoolean: false,
			fieldNumber: 0,
			fieldArrayString: [''],
			fieldEnum: 'a',
			fieldDate: expect.any(String),
			fieldDateArray: [expect.any(String)],
		})
	})
})
