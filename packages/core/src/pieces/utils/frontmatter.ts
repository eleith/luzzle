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

export type PieceFrontmatterPropertyScalar = {
	type: 'string' | 'boolean' | 'integer'
	format?: 'asset' | 'date' | 'comma-separated' | 'paragraph' | 'markdown'
	nullable?: boolean
	pattern?: string
	enum?: string[] | number[]
	examples?: Array<string | number | boolean>
	default?: string | number | boolean
}

export type PieceFrontmatterPropertyList = {
	type: 'array'
	format?: undefined
	pattern?: undefined
	examples?: undefined
	default?: undefined
	nullable?: boolean
	enum?: string[] | number[]
	items: PieceFrontmatterProperty
}

export type PieceFrontmatterPropertyObject = {
	type: 'object'
	format?: undefined
	pattern?: undefined
	examples?: undefined
	default?: undefined
	nullable?: boolean
	properties: { [key: string]: PieceFrontmatterProperty }
	required?: string[]
}

type PieceFrontmatterProperty =
	| PieceFrontmatterPropertyScalar
	| PieceFrontmatterPropertyList
	| PieceFrontmatterPropertyObject

type PieceFrontmatterSchemaField = PieceFrontmatterProperty & { name: string }

/**
 * Maps schema properties to a flat array of field definitions with names.
 */
function getPieceFrontmatterSchemaFields<M extends PieceFrontmatter>(
	schema: PieceFrontmatterSchema<M>
): Array<PieceFrontmatterSchemaField> {
	return Object.keys(schema.properties).map((key) => {
		const required = Array.isArray(schema.required) ? (schema.required as string[]) : []
		const isRequired = required.includes(key)
		const property = schema.properties[key] as PieceFrontmatterProperty
		const nullable = isRequired ? false : property.nullable ?? true

		return {
			...property,
			name: key,
			nullable
		}
	})
}

/**
 * Converts a frontmatter value to its database-compatible representation.
 * Arrays and objects are kept as structured data for JSON serialization.
 */
function pieceFrontmatterValueToDatabaseValue(
	value: unknown,
	property: PieceFrontmatterProperty
): unknown {
	if (value === undefined || value === null) {
		return null
	}

	switch (property.type) {
		case 'boolean':
			return value ? 1 : 0
		case 'integer':
			return Number(value)
		case 'array':
			return (value as unknown[]).map((v) =>
				pieceFrontmatterValueToDatabaseValue(v, property.items)
			)
		case 'object': {
			const obj = value as Record<string, unknown>
			const result: Record<string, unknown> = { ...obj } // Allow additional properties
			for (const key in property.properties) {
				result[key] = pieceFrontmatterValueToDatabaseValue(
					obj[key],
					property.properties[key]
				)
			}
			return result
		}
		case 'string':
			if (property.format === 'date') {
				return new Date(value as string).getTime()
			}
			if (property.format === 'comma-separated') {
				return (value as string).split(',').map((s) => s.trim())
			}
			return value
		default:
			return value
	}
}

function databaseValueToPieceFrontmatterValue(
	value: unknown,
	property: PieceFrontmatterProperty
): unknown {
	if (value === undefined || value === null) {
		return null
	}

	switch (property.type) {
		case 'boolean':
			return value ? true : false
		case 'integer':
			return Number(value)
		case 'array': {
			const values = Array.isArray(value) ? value : (value as string).split(',')
			return values.map((v) =>
				databaseValueToPieceFrontmatterValue(v, property.items)
			)
		}
		case 'object': {
			const obj = value as Record<string, unknown>
			const result: Record<string, unknown> = { ...obj }
			for (const key in property.properties) {
				result[key] = databaseValueToPieceFrontmatterValue(
					obj[key],
					property.properties[key]
				)
			}
			return result
		}
		case 'string':
			if (property.format === 'date') {
				return new Date(value as number).toLocaleDateString()
			}
			if (property.format === 'comma-separated') {
				if (Array.isArray(value)) {
					return value.join(', ')
				}
				try {
					const parsed = JSON.parse(value as string)
					if (Array.isArray(parsed)) {
						return parsed.join(', ')
					}
				} catch {
					// ignore
				}
				return value
			}
			return value
		default:
			return value
	}
}

function initializePieceFrontMatterFromProperties(
	properties: { [key: string]: PieceFrontmatterProperty },
	requiredFields: string[] = [],
	minimal: boolean = false
): Record<string, unknown> {
	const frontmatter: Record<string, unknown> = {}

	for (const name in properties) {
		const property = properties[name]
		const isRequired = requiredFields.includes(name)

		if (property.type === 'object') {
			const subValue = initializePieceFrontMatterFromProperties(
				property.properties,
				property.required || [],
				minimal
			)

			if (Object.keys(subValue).length > 0) {
				frontmatter[name] = subValue
			} else if (isRequired) {
				frontmatter[name] = {}
			}
			continue
		}

		const isArray = property.type === 'array'
		const examples = isArray ? property.items.examples : property.examples
		const def = isArray ? property.items.default : property.default
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
	const required = Array.isArray(schema.required) ? (schema.required as string[]) : []
	return initializePieceFrontMatterFromProperties(
		schema.properties as { [key: string]: PieceFrontmatterProperty },
		required,
		minimal
	) as M
}

export {
	type PieceFrontmatter,
	type PieceFrontmatterProperty,
	type PieceFrontmatterSchemaField,
	type PieceFrontmatterSchema,
	getPieceFrontmatterSchemaFields,
	pieceFrontmatterValueToDatabaseValue,
	databaseValueToPieceFrontmatterValue,
	initializePieceFrontMatter,
	initializePieceFrontMatterFromProperties,
}
