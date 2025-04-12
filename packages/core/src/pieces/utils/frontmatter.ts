import { JSONSchemaType } from 'ajv'

type PieceFrontMatterValue = string | number | boolean | string[] | number[] | boolean[]
type PieceFrontmatter = {
	[key: string]: PieceFrontMatterValue
}
type PieceFrontmatterSchema<M extends PieceFrontmatter> = JSONSchemaType<M>
type PieceFrontmatterSchemaFieldScalar = {
	name: string
	type: 'string' | 'boolean' | 'integer'
	format?: 'asset' | 'date' | 'comma-separated' | 'paragraph'
	nullable?: boolean
	pattern?: string
	enum?: string[] | number[]
	examples?: Array<string | number | boolean>
	default?: string | number | boolean
}
type PieceFrontmatterSchemaFieldList = {
	name: string
	type: 'array'
	format?: undefined
	pattern?: undefined
	examples?: undefined
	default?: undefined
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
		const required = Array.isArray(schema.required) ? schema.required : []
		const nullable = required.some(f => f === key) || schema.properties[key]?.nullable

		return { name: key, ...schema.properties[key], nullable } as PieceFrontmatterSchemaField
	})
}

function pieceFrontmatterValueToDatabaseValue(value: unknown, field: PieceFrontmatterSchemaField) {
	if (value === undefined) {
		return null
	}

	if (field.format === 'date') {
		return new Date(value as string).getTime()
	} else if (field.format === 'comma-separated') {
		return JSON.stringify((value as string).split(','))
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
	} else if (field.format === 'comma-separated') {
		return JSON.parse(value as string).join(',')
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
	schema: PieceFrontmatterSchema<M>,
	minimal: boolean = false
): M {
	const frontmatter: { [key: string]: PieceFrontMatterValue | PieceFrontMatterValue[] } = {}
	const fields = getPieceFrontmatterSchemaFields(schema)

	for (const field of fields) {
		const name = field.name
		const required = schema.required?.includes(name)
		const isArray = field.type === 'array'
		const examples = isArray ? field.items?.examples : field.examples
		const def = isArray ? field.items?.default : field.default
		const example = examples?.[0]
		const hasInitialValue = def !== undefined || example !== undefined

		if (required || (!minimal && hasInitialValue)) {
			const initialValue = def !== undefined ? def : example

			if (initialValue !== undefined) {
				frontmatter[name] = isArray ? [initialValue] : initialValue
			} else if (required) {
				throw new Error(
					`can not initialize ${schema.title} field "${name}" as it is required but there are no examples or a default value`
				)
			}
		}
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
