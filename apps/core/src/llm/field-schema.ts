import type { SchemaObject } from 'ajv'
import traverse from 'json-schema-traverse'
import type { PieceFrontmatter, PieceFrontmatterSchema } from '../pieces/utils/frontmatter.js'

export function selectFieldsSchema(
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	keys: string[]
): PieceFrontmatterSchema<PieceFrontmatter> {
	if (!Array.isArray(keys) || keys.length === 0) {
		throw new Error('Field generation requires a nonempty selection of fields.')
	}
	for (const key of keys) {
		if (typeof key !== 'string' || !schema.properties || !Object.hasOwn(schema.properties, key)) {
			throw new Error('Field generation requires an own top-level property.')
		}
		if (key === '__proto__')
			throw new Error('The validator does not support a field named __proto__.')
	}

	traverse(schema, {
		cb(node) {
			if (
				['$ref', '$dynamicRef', '$recursiveRef'].some((keyword) => Object.hasOwn(node, keyword))
			) {
				throw new Error('Field generation requires reference-free schemas.')
			}
		},
	})

	const responseSchema: SchemaObject = {
		type: 'object',
		properties: Object.fromEntries(keys.map((key) => [key, schema.properties[key]])),
		required: [...new Set(keys)],
		additionalProperties: false,
	}
	if (Object.hasOwn(schema, '$schema')) responseSchema.$schema = schema.$schema
	return responseSchema as PieceFrontmatterSchema<PieceFrontmatter>
}
