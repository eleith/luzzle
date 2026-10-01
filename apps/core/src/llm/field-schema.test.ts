import type { JSONSchemaType, SchemaObject } from 'ajv'
import { describe, expect, test } from 'vitest'
import compile from '../lib/ajv.js'
import type { PieceFrontmatter } from '../pieces/utils/frontmatter.js'
import { selectFieldSchema } from './field-schema.js'

const makeSchema = (field: unknown, extra: SchemaObject = {}) =>
	({
		type: 'object',
		properties: { field, other: { type: 'string' } },
		required: ['other'],
		...extra,
	}) as JSONSchemaType<PieceFrontmatter>

describe('selectFieldSchema', () => {
	test('requires only the selected property and rejects other output keys', () => {
		const source = makeSchema(
			{ type: 'string', minLength: 2 },
			{
				minProperties: 2,
				allOf: [{ required: ['other'] }],
				$defs: { unused: { type: 'integer' } },
			}
		)
		const result = selectFieldSchema(source, 'field')
		expect(result).toEqual({
			type: 'object',
			properties: { field: { type: 'string', minLength: 2 } },
			required: ['field'],
			additionalProperties: false,
		})
		const validate = compile(result)
		expect(validate({ field: 'value' })).toBe(true)
		for (const invalid of [{}, { field: 'x' }, { field: 'value', other: 'extra' }]) {
			expect(validate(invalid)).toBe(false)
		}
	})

	test('preserves inline array/object constraints, nullability, formats, and source data', () => {
		const source = makeSchema({
			type: 'array',
			items: {
				type: 'object',
				properties: { date: { type: 'string', nullable: true, format: 'date' } },
				required: ['date'],
			},
		})
		const original = structuredClone(source)
		const result = selectFieldSchema(source, 'field')
		const validate = compile(result)
		expect(validate({ field: [{ date: null }, { date: '2026-01-02' }] })).toBe(true)
		expect(validate({ field: [{ date: 'invalid' }] })).toBe(false)
		expect(source).toEqual(original)
		expect(result.properties.field).toEqual(source.properties.field)
		expect(result.properties.field).not.toBe(source.properties.field)
	})

	test('does not mistake literal example data or property names for schema references', () => {
		const data = { $ref: '#', $dynamicRef: '#example' }
		const source = makeSchema({
			type: 'object',
			default: data,
			examples: [data],
			const: data,
			enum: [data],
			properties: { $ref: { type: 'string' }, $dynamicRef: { type: 'string' } },
		})
		const result = selectFieldSchema(source, 'field')
		expect(result.properties.field).toEqual(source.properties.field)
		;(result.properties.field as SchemaObject).default.$ref = 'changed'
		expect(data.$ref).toBe('#')
	})

	test('selects literal own keys, not inherited or missing keys', () => {
		const source = makeSchema(true, { properties: { 'a/b~c': { type: 'string' } } })
		expect(selectFieldSchema(source, 'a/b~c').required).toEqual(['a/b~c'])
		for (const key of ['missing', 'toString', '__proto__']) {
			expect(() => selectFieldSchema(source, key)).toThrow('own top-level property')
		}
		expect(() =>
			selectFieldSchema({ type: 'object' } as JSONSchemaType<PieceFrontmatter>, 'field')
		).toThrow('own top-level property')
	})

	test('rejects a reserved field name that the validator skips', () => {
		const source = makeSchema(true, { properties: JSON.parse('{"__proto__":{"type":"string"}}') })
		expect(() => selectFieldSchema(source, '__proto__')).toThrow('validator does not support')
	})

	test.each(['$ref', '$dynamicRef', '$recursiveRef'])(
		'rejects an unexpected %s instead of resolving it',
		(keyword) => {
			expect(() => selectFieldSchema(makeSchema({ [keyword]: '#' }), 'field')).toThrow(
				'reference-free schemas'
			)
		}
	)

	test.each([
		makeSchema({ type: 'array', items: { $ref: '#/$defs/item' } }),
		makeSchema({
			type: 'object',
			allOf: [{ type: 'object' }],
			properties: { default: { $ref: '#' } },
		}),
		makeSchema({ type: 'string' }, { definitions: { unused: { $ref: '#' } } }),
		makeSchema({ type: 'string' }, { $defs: { unused: { $ref: '#' } } }),
		makeSchema({ type: 'string' }, { $ref: 'external.json' }),
	])('rejects references anywhere in the input schema', (source) => {
		expect(() => selectFieldSchema(source, 'field')).toThrow('reference-free schemas')
	})

	test('preserves the dialect for the normal Ajv compiler', () => {
		const dialect = 'http://json-schema.org/draft-07/schema#'
		const result = selectFieldSchema(makeSchema({ type: 'string' }, { $schema: dialect }), 'field')
		expect(result.$schema).toBe(dialect)
		expect(compile(result)({ field: 'value' })).toBe(true)
	})
})
