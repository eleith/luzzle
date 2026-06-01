import { PieceFrontmatter } from './utils/frontmatter.js'
import { PropertiesSchema, JSONSchemaType } from 'ajv/dist/types/json-schema.js'
import { CreateTableBuilder, sql } from 'kysely'

function pieceSchemaFieldTypeToColumnType(type: string) {
	switch (type) {
		case 'string':
			return 'text'
		case 'integer':
			return 'integer'
		case 'boolean':
			return 'boolean'
		default:
			throw new Error(`json schema type ${type} not supported in sqlite`)
	}
}

function jsonToPieceSchema(json: string): JSONSchemaType<PieceFrontmatter> {
	try {
		return JSON.parse(json) as JSONSchemaType<PieceFrontmatter>
	} catch (error) {
		throw new Error(`Error parsing schema: ${error}`)
	}
}

function addColumnsFromPieceSchema<T>(
	tableBuilder: CreateTableBuilder<string, never>,
	schema: JSONSchemaType<T>
) {
	const properties = schema.properties as PropertiesSchema<T>
	const fields = Object.keys(properties)
	const requiredFields = (schema.required as (keyof T)[]) || []

	tableBuilder = tableBuilder.addColumn('id', 'text', (col) => col.primaryKey().notNull())
	tableBuilder = tableBuilder.addColumn('slug', 'text', (col) => col.notNull().unique())
	tableBuilder = tableBuilder.addColumn('date_added', 'datetime', (col) =>
		col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
	)
	tableBuilder = tableBuilder.addColumn('date_updated', 'datetime')
	tableBuilder = tableBuilder.addColumn('note', 'text')

	fields.forEach((key) => {
		const field = properties[key as keyof T]
		const required = requiredFields.includes(key as keyof T)

		if ('type' in field) {
			const type = field.type === 'array' ? field.items.type : field.type
			const format = field.type === 'array' ? field.items.format : field.format
			const columnType = pieceSchemaFieldTypeToColumnType(type)
			const tableColumnType = format === 'date' ? 'datetime' : columnType

			tableBuilder = tableBuilder.addColumn(key, tableColumnType, (col) => {
				if (required) {
					col = col.notNull()
				}

				if (field.enum) {
					const values = field.enum.map((value) => `'${value}'`).join(', ')
					const constraint = `${key} IN (${values})`
					col = col.check(sql.raw(constraint))
				}

				if (field.default) {
					col = col.defaultTo(field.default)
				}

				return col
			})
		}
	})

	return tableBuilder
}

export { jsonToPieceSchema, addColumnsFromPieceSchema }
