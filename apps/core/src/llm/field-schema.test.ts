import type { JSONSchemaType, SchemaObject } from 'ajv'
import { describe, expect, test } from 'vitest'
import compile from '../lib/ajv.js'
import type { PieceFrontmatter } from '../pieces/utils/frontmatter.js'
import { selectFieldsSchema } from './field-schema.js'

const makeSchema = (field: unknown, extra: SchemaObject = {}) =>
	({
		type: 'object',
		properties: { field, other: { type: 'string' } },
		required: ['other'],
		...extra,
	}) as JSONSchemaType<PieceFrontmatter>

describe('selectFieldsSchema', () => {
	test('requires only the selected property and rejects other output keys', () => {
		const source = makeSchema(
			{ type: 'string', minLength: 2 },
			{
				minProperties: 2,
				allOf: [{ required: ['other'] }],
				$defs: { unused: { type: 'integer' } },
			}
		)
		const result = selectFieldsSchema(source, ['field'])
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

	test('selects many or all fields with exact required keys, including metadata named body', () => {
		const source = makeSchema({ type: 'string', nullable: true }, {
			properties: {
				field: { type: 'string', nullable: true },
				body: { type: 'string', minLength: 2 },
				other: { type: 'integer', minimum: 1 },
			},
		})
		const original = structuredClone(source)
		for (const keys of [['field', 'body'], Object.keys(source.properties)]) {
			const selected = selectFieldsSchema(source, keys)
			expect(Object.keys(selected.properties)).toEqual(keys)
			expect(selected.required).toEqual(keys)
			expect(selected.additionalProperties).toBe(false)
			for (const key of keys) {
				expect(selected.properties[key]).toEqual(source.properties[key])
			}
			const values = { field: null, body: 'Metadata', ...(keys.includes('other') ? { other: 1 } : {}) }
			const validate = compile(selected)
			expect(validate(values)).toBe(true)
			expect(validate({ ...values, extra: true })).toBe(false)
			expect(validate({ ...values, body: '' })).toBe(false)
			expect(validate({ ...values, field: 42 })).toBe(false)
			for (const key of keys) {
				const missing = { ...values } as Record<string, unknown>
				delete missing[key]
				expect(validate(missing)).toBe(false)
			}
		}
		expect(source).toEqual(original)
	})

	test('requires a nonempty selection and validates every key', () => {
		const source = makeSchema({ type: 'string' })
		expect(() => selectFieldsSchema(source, [])).toThrow('nonempty')
		expect(() => selectFieldsSchema(source, ['field', 'missing'])).toThrow('own top-level')
		expect(() => selectFieldsSchema(source, [42 as unknown as string])).toThrow('own top-level')
	})

	test('treats repeated selections as a single required property', () => {
		const selected = selectFieldsSchema(makeSchema({ type: 'string' }), ['field', 'field'])
		expect(selected.required).toEqual(['field'])
		expect(compile(selected)({ field: 'value' })).toBe(true)
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
		const result = selectFieldsSchema(source, ['field'])
		const validate = compile(result)
		expect(validate({ field: [{ date: null }, { date: '2026-01-02' }] })).toBe(true)
		expect(validate({ field: [{ date: 'invalid' }] })).toBe(false)
		expect(source).toEqual(original)
		expect(result.properties.field).toEqual(source.properties.field)
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
		const result = selectFieldsSchema(source, ['field'])
		expect(result.properties.field).toEqual(source.properties.field)
		expect(data.$ref).toBe('#')
	})

	test('selects literal own keys, not inherited or missing keys', () => {
		const source = makeSchema(true, { properties: { 'a/b~c': { type: 'string' } } })
		expect(selectFieldsSchema(source, ['a/b~c']).required).toEqual(['a/b~c'])
		for (const key of ['missing', 'toString', '__proto__']) {
			expect(() => selectFieldsSchema(source, [key])).toThrow('own top-level property')
		}
		expect(() =>
			selectFieldsSchema({ type: 'object' } as JSONSchemaType<PieceFrontmatter>, ['field'])
		).toThrow('own top-level property')
	})

	test('rejects a reserved field name that the validator skips', () => {
		const source = makeSchema(true, { properties: JSON.parse('{"__proto__":{"type":"string"}}') })
		expect(() => selectFieldsSchema(source, ['__proto__'])).toThrow('validator does not support')
	})

	test.each(['$ref', '$dynamicRef', '$recursiveRef'])(
		'rejects an unexpected %s instead of resolving it',
		(keyword) => {
			expect(() => selectFieldsSchema(makeSchema({ [keyword]: '#' }), ['field'])).toThrow(
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
		expect(() => selectFieldsSchema(source, ['field'])).toThrow('reference-free schemas')
	})

	test('preserves the dialect for the normal Ajv compiler', () => {
		const dialect = 'http://json-schema.org/draft-07/schema#'
		const result = selectFieldsSchema(makeSchema({ type: 'string' }, { $schema: dialect }), ['field'])
		expect(result.$schema).toBe(dialect)
		expect(compile(result)({ field: 'value' })).toBe(true)
	})
})
