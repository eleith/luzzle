import type { SchemaObject } from 'ajv'
import traverse from 'json-schema-traverse'
import type { PieceFrontmatter, PieceFrontmatterSchema } from '../pieces/utils/frontmatter.js'

export function selectFieldSchema(
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	key: string
): PieceFrontmatterSchema<PieceFrontmatter> {
	if (!schema.properties || !Object.hasOwn(schema.properties, key)) {
		throw new Error('Field generation requires an own top-level property.')
	}
	if (key === '__proto__')
		throw new Error('The validator does not support a field named __proto__.')

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
		properties: { [key]: schema.properties[key] },
		required: [key],
		additionalProperties: false,
	}
	if (Object.hasOwn(schema, '$schema')) responseSchema.$schema = schema.$schema
	return structuredClone(responseSchema) as PieceFrontmatterSchema<PieceFrontmatter>
}
