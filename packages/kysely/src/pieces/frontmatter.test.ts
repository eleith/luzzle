import { describe, expect, test, vi, afterEach } from 'vitest'
import * as frontmatter from './frontmatter.js'
import { makeSchema } from './piece.fixtures.js'

describe('src/pieces/frontmatter.ts', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	test('getPieceFrontmatterKeysFromSchema', () => {
		const schema = makeSchema({
			fieldLuzzle: {
				type: 'string',
				metadata: { luzzleFormat: 'f', luzzlePattern: 'x', luzzleEnum: ['a'] },
			},
			field: {
				type: 'string',
			},
			fieldEnum: {
				enum: ['a', 'b'],
			},
			fieldProperties: {
				properties: {
					subfield: { type: 'string' },
				},
			},
			fieldElements: {
				elements: {
					type: 'string',
					metadata: { luzzleFormat: 'f', luzzlePattern: 'x', luzzleEnum: ['a'] },
				},
			},
		})

		const keys = frontmatter.getPieceFrontmatterKeysFromSchema(schema)

		expect(keys.find(({ name }) => name === 'fieldLuzzle')).toMatchObject({
			name: 'fieldLuzzle',
			type: 'string',
			metadata: { format: 'f', pattern: 'x', enum: ['a'] },
		})

		expect(keys.find(({ name }) => name === 'fieldEnum')).toMatchObject({
			name: 'fieldEnum',
			metadata: { enum: ['a', 'b'] },
		})

		expect(keys.find(({ name }) => name === 'fieldProperties')).toMatchObject({
			name: 'fieldProperties',
			collection: 'object',
		})

		expect(keys.find(({ name }) => name === 'fieldElements')).toMatchObject({
			name: 'fieldElements',
			type: 'string',
			collection: 'array',
			metadata: { format: 'f', pattern: 'x', enum: ['a'] },
		})

		expect(keys.find(({ name }) => name === 'field')).toMatchObject({
			name: 'field',
			type: 'string',
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
})
