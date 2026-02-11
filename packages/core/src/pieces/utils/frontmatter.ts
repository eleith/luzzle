import { JSONSchemaType } from "ajv"

export type PieceFrontMatterValue =
	| string
	| number
	| boolean
	| PieceFrontMatterValue[]
	| { [key: string]: PieceFrontMatterValue }

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

type PieceFrontmatterSchemaFieldObject = {
	name: string
	type: 'object'
	format?: undefined
	pattern?: undefined
	examples?: undefined
	default?: undefined
	nullable?: boolean
	properties: { [key: string]: Omit<PieceFrontmatterSchemaField, 'name'> }
	required?: string[]
}

type PieceFrontmatterSchemaField =
	| PieceFrontmatterSchemaFieldScalar
	| PieceFrontmatterSchemaFieldList
	| PieceFrontmatterSchemaFieldObject

/**
 * Maps schema properties to a flat array of field definitions with names.
 */
function getPieceFrontmatterSchemaFields<M extends PieceFrontmatter>(
	schema: PieceFrontmatterSchema<M>
): Array<PieceFrontmatterSchemaField> {
	return Object.keys(schema.properties).map((key) => {
		const required = Array.isArray(schema.required) ? schema.required : []
		const nullable = required.some((f) => f === key) || schema.properties[key]?.nullable

		return { name: key, ...schema.properties[key], nullable } as PieceFrontmatterSchemaField
	})
}

/**
 * Converts a frontmatter value to its database-compatible representation.
 * Arrays and objects are kept as structured data for JSON serialization.
 */
function pieceFrontmatterValueToDatabaseValue(
	value: unknown,
	field: PieceFrontmatterSchemaField
): unknown {
	if (value === undefined || value === null) {
		return null
	}

	switch (field.type) {
		case 'boolean':
			return value ? 1 : 0
		case 'integer':
			return Number(value)
		case 'array':
			return (value as unknown[]).map((v) =>
				pieceFrontmatterValueToDatabaseValue(v, field.items as PieceFrontmatterSchemaField)
			)
		case 'object': {
			const obj = value as Record<string, unknown>
			const result: Record<string, unknown> = { ...obj } // Allow additional properties
			for (const key in field.properties) {
				result[key] = pieceFrontmatterValueToDatabaseValue(
					obj[key],
					{ ...field.properties[key], name: key } as PieceFrontmatterSchemaField
				)
			}
			return result
		}
		case 'string':
			if (field.format === 'date') {
				return new Date(value as string).getTime()
			}
			if (field.format === 'comma-separated') {
				return JSON.stringify((value as string).split(','))
			}
			return value
		default:
			return value
	}
}

/**
 * Converts a database value back to a frontmatter-compatible representation.
 * Handles both new JSON structures and legacy CSV-separated strings for arrays.
 */
function databaseValueToPieceFrontmatterValue(
	value: unknown,
	field: PieceFrontmatterSchemaField
): unknown {
	if (value === undefined || value === null) {
		return null
	}

	switch (field.type) {
		case 'boolean':
			return value ? true : false
		case 'integer':
			return Number(value)
		case 'array': {
			// Backwards compatibility: Handle legacy CSV strings stored in older caches
			const values = Array.isArray(value) ? value : (value as string).split(',')
			return values.map((v) =>
				databaseValueToPieceFrontmatterValue(v, field.items as PieceFrontmatterSchemaField)
			)
		}
		case 'object': {
			const obj = value as Record<string, unknown>
			const result: Record<string, unknown> = { ...obj }
			for (const key in field.properties) {
				result[key] = databaseValueToPieceFrontmatterValue(
					obj[key],
					{ ...field.properties[key], name: key } as PieceFrontmatterSchemaField
				)
			}
			return result
		}
		case 'string':
			if (field.format === 'date') {
				return new Date(value as number).toLocaleDateString()
			}
			if (field.format === 'comma-separated') {
				try {
					return JSON.parse(value as string).join(',')
				} catch {
					return value
				}
			}
			return value
		default:
			return value
	}
}

/**
 * Recursively initializes frontmatter based on schema fields.
 */
function initializePieceFrontMatterFromFields(
	fields: PieceFrontmatterSchemaField[],
	requiredFields: string[] = [],
	minimal: boolean = false
): Record<string, unknown> {
	const frontmatter: Record<string, unknown> = {}

	for (const field of fields) {
		const name = field.name
		const isRequired = requiredFields.includes(name)

		// Handle nested objects
		if (field.type === 'object') {
			const subFields = Object.keys(field.properties).map(
				(key) =>
					({
						name: key,
						...field.properties[key],
						nullable: field.required?.includes(key) || field.properties[key].nullable,
					}) as PieceFrontmatterSchemaField
			)

			const subValue = initializePieceFrontMatterFromFields(subFields, field.required || [], minimal)

			if (Object.keys(subValue).length > 0) {
				frontmatter[name] = subValue
			} else if (isRequired) {
				frontmatter[name] = {}
			}
			continue
		}

		// Handle scalars and arrays
		const isArray = field.type === 'array'
		const examples = isArray ? field.items?.examples : field.examples
		const def = isArray ? field.items?.default : field.default
		const example = examples?.[0]
		const hasInitialValue = def !== undefined || example !== undefined

		if (isRequired || (!minimal && hasInitialValue)) {
			const initialValue = def !== undefined ? def : example

			if (initialValue !== undefined) {
				frontmatter[name] = isArray ? [initialValue] : initialValue
			} else if (isRequired) {
				throw new Error(
					`can not initialize field "${name}" as it is required but there are no examples or a default value`
				)
			}
		}
	}

	return frontmatter
}

function initializePieceFrontMatter<M extends PieceFrontmatter>(
	schema: PieceFrontmatterSchema<M>,
	minimal: boolean = false
): M {
	const fields = getPieceFrontmatterSchemaFields(schema)
	const required = Array.isArray(schema.required) ? schema.required : []
	return initializePieceFrontMatterFromFields(fields, required, minimal) as M
}

export {
	type PieceFrontmatter,
	type PieceFrontmatterSchemaField,
	type PieceFrontmatterSchema,
	getPieceFrontmatterSchemaFields,
	pieceFrontmatterValueToDatabaseValue,
	databaseValueToPieceFrontmatterValue,
	initializePieceFrontMatter,
}
