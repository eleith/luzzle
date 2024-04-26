import { JSONSchemaType } from 'ajv'

type PieceFrontMatterValue = string | number | boolean | string[] | number[] | boolean[]
type PieceFrontmatter = {
	[key: string]: PieceFrontMatterValue
}
type PieceFrontmatterSchema<M extends PieceFrontmatter> = JSONSchemaType<M>
type PieceFrontmatterSchemaFieldScalar = {
	name: string
	type: 'string' | 'boolean' | 'integer'
	format?: 'asset' | 'date'
	nullable?: boolean
	pattern?: string
	enum?: string[] | number[]
}
type PieceFrontmatterSchemaFieldList = {
	name: string
	type: 'array'
	format?: undefined
	pattern?: undefined
	nullable?: boolean
	enum?: string[] | number[]
	items: Omit<PieceFrontmatterSchemaField, 'name'>
}

type PieceFrontmatterSchemaField =
	| PieceFrontmatterSchemaFieldScalar
	| PieceFrontmatterSchemaFieldList

function getPieceFrontmatterSchemaFields<M extends PieceFrontmatter>(
	schema: PieceFrontmatterSchema<M>
): Array<PieceFrontmatterSchemaField> {
	return Object.keys(schema.properties).map((key) => {
		return { name: key, ...schema.properties[key] } as PieceFrontmatterSchemaField
	})
}

function pieceFrontmatterValueToDatabaseValue(value: unknown, field: PieceFrontmatterSchemaField) {
	if (value === undefined) {
		return null
	}

	if (field.format === 'date') {
		return new Date(value as string).getTime()
	} else if (field.type === 'boolean') {
		return value ? 1 : 0
	} else if (field.type === 'array') {
		return (value as string[]).join(',')
	}

	return value as unknown
}

function databaseValueToPieceFrontmatterValue(
	value: unknown,
	field: PieceFrontmatterSchemaField
): unknown {
	if (field.format === 'date') {
		return new Date(value as number).toLocaleDateString()
	} else if (field.type === 'boolean') {
		return value ? true : false
	} else if (field.type === 'array') {
		const values = (value as string).split(',')
		return values.map((v) =>
			databaseValueToPieceFrontmatterValue(v, field.items as PieceFrontmatterSchemaField)
		)
	}

	return value
}

function initializePieceFrontMatter<M extends PieceFrontmatter>(
	schema: PieceFrontmatterSchema<M>
): M {
	const frontmatter: { [key: string]: PieceFrontMatterValue | PieceFrontMatterValue[] } = {}
	const fields = getPieceFrontmatterSchemaFields(schema).filter((field) => !field.nullable)

	for (const field of fields) {
		const isArray = field.type === 'array'
		const type = isArray ? field.items?.type : field.type
		const format = isArray ? field.items?.format : field.format
		const enumValues = isArray ? field.items?.enum : field.enum
		let value: PieceFrontMatterValue = 0

		if (enumValues && enumValues.length > 0) {
			value = enumValues[0]
		} else if (format === 'date') {
			value = new Date().toLocaleDateString()
		} else if (type === 'string') {
			value = ''
		} else if (type === 'integer') {
			value = 0
		} else if (type === 'boolean') {
			value = false
		}

		frontmatter[field.name] = isArray ? [value] : value
	}

	return frontmatter as M
}

export {
	type PieceFrontmatter,
	type PieceFrontmatterSchema,
	type PieceFrontmatterSchemaField,
	getPieceFrontmatterSchemaFields,
	pieceFrontmatterValueToDatabaseValue,
	databaseValueToPieceFrontmatterValue,
	initializePieceFrontMatter,
}
