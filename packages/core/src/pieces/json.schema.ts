import { PieceFrontmatter } from './utils/frontmatter.js'
import { JSONSchemaType } from 'ajv'
import { PieceJSONSchemas, Pieces } from './types/index.js'

function getPieceSchema(table: Pieces): JSONSchemaType<PieceFrontmatter> {
	for (const [key, schema] of Object.entries(PieceJSONSchemas)) {
		if (key === table) {
			return schema as JSONSchemaType<PieceFrontmatter>
		}
	}

	throw new Error(`Invalid piece type: ${table}`)
}

export { getPieceSchema }
