import { JTDSchemaType, SomeJTDSchemaType } from 'ajv/dist/core.js'
import { PieceSelectable, PieceDatabaseOnlyFields } from '../tables/pieces.schema.js'

type NonNullableKeys<T> = {
	[K in keyof T]-?: null extends T[K] ? never : K
}[keyof T]

type NullableKeys<T> = {
	[K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K
}[keyof T]

type UnNullify<T> = {
	[key in keyof T]: null extends T[key] ? Exclude<T[key], null> : T[key]
}

type NullToPartials<T> = Pick<T, NonNullableKeys<T>> & Partial<UnNullify<Pick<T, NullableKeys<T>>>>
type IncludeIfExists<A, B> = B extends void ? A : A & B
type OmitIfExists<A, B> = B extends void ? A : Omit<A, keyof B>
type PieceFrontmatterFields = Record<string, string | string[] | number | boolean | undefined>

type PieceFrontmatter<
	T extends PieceSelectable = PieceSelectable,
	F extends PieceFrontmatterFields | void = void
> = NullToPartials<IncludeIfExists<OmitIfExists<Omit<T, PieceDatabaseOnlyFields>, F>, F>>

type PieceFrontmatterLuzzleMetadata = {
	luzzleFormat: 'date-string' | 'attachment' | 'boolean-int'
	luzzlePattern?: string
	luzzleEnum?: string[]
}

type PieceFrontmatterSchemaField = {
	name: string
	collection?: 'array' | 'object'
	type?:
		| JTDSchemaType<string, Record<string, never>>['type']
		| JTDSchemaType<number, Record<string, never>>['type']
		| JTDSchemaType<boolean, Record<string, never>>['type']
	metadata?: {
		format: PieceFrontmatterLuzzleMetadata['luzzleFormat']
		pattern?: PieceFrontmatterLuzzleMetadata['luzzlePattern']
		enum?: PieceFrontmatterLuzzleMetadata['luzzleEnum']
	}
	nullable?: boolean
	required?: boolean
}

type PieceFrontmatterJtdSchema<
	M extends PieceFrontmatter<PieceSelectable, void | PieceFrontmatterFields>
> = JTDSchemaType<M>

function extractFrontmatterSchemaField(
	key: string,
	value: SomeJTDSchemaType
): PieceFrontmatterSchemaField {
	const schemaField: PieceFrontmatterSchemaField = {
		name: key,
	}

	if ('elements' in value && 'type' in value.elements) {
		const metadata = value.elements.metadata as PieceFrontmatterLuzzleMetadata | undefined

		schemaField.type = value.elements.type
		schemaField.collection = 'array'

		if (metadata?.luzzleFormat !== undefined) {
			schemaField.metadata = {
				format: metadata.luzzleFormat,
				...(metadata.luzzlePattern !== undefined && { pattern: metadata.luzzlePattern }),
				...(metadata.luzzleEnum !== undefined && { enum: metadata.luzzleEnum }),
			}
		}

		if (value.elements.nullable !== undefined) {
			schemaField.nullable = value.elements.nullable
		}
	} else if ('properties' in value) {
		schemaField.collection = 'object'
		if (value.nullable !== undefined) {
			schemaField.nullable = value.nullable
		}
	} else if ('type' in value) {
		const metadata = value.metadata as PieceFrontmatterLuzzleMetadata | undefined

		schemaField.type = value.type

		if (metadata?.luzzleFormat !== undefined) {
			schemaField.metadata = {
				format: metadata.luzzleFormat,
				...(metadata.luzzlePattern !== undefined && { pattern: metadata.luzzlePattern }),
				...(metadata.luzzleEnum !== undefined && { enum: metadata.luzzleEnum }),
			}
		}

		if (value.nullable !== undefined) {
			schemaField.nullable = value.nullable
		}
	} else if ('enum' in value) {
		schemaField.metadata = {
			enum: value.enum,
		} as PieceFrontmatterSchemaField['metadata']
		if (value.nullable !== undefined) {
			schemaField.nullable = value.nullable
		}
	} else {
		throw new Error(`invalid schema at key ${key} of ${value}`)
	}

	return schemaField
}

function getPieceFrontmatterKeysFromSchema<M>(
	schema: JTDSchemaType<M>
): Array<PieceFrontmatterSchemaField> {
	const fields: Array<PieceFrontmatterSchemaField> = []

	if ('properties' in schema) {
		const requiredProperties = schema.properties as { [key: string]: SomeJTDSchemaType }
		for (const [key, value] of Object.entries(requiredProperties)) {
			const schemaField = extractFrontmatterSchemaField(key, value)
			fields.push({ ...schemaField, required: true })
		}
	}

	if ('optionalProperties' in schema) {
		const optionalProperties = schema.optionalProperties as { [key: string]: SomeJTDSchemaType }
		for (const [key, value] of Object.entries(optionalProperties)) {
			const schemaField = extractFrontmatterSchemaField(key, value)
			fields.push({ ...schemaField })
		}
	}

	return fields
}

function unformatPieceFrontmatterValue(
	value: unknown,
	format?: PieceFrontmatterLuzzleMetadata['luzzleFormat']
) {
	if (format === 'date-string') {
		return new Date(value as string).getTime()
	} else if (format === 'boolean-int') {
		return value ? 1 : 0
	}

	return value
}

function formatPieceFrontmatterValue(
	value: unknown,
	format?: PieceFrontmatterLuzzleMetadata['luzzleFormat']
) {
	if (format === 'date-string') {
		return new Date(value as number).toLocaleDateString()
	} else if (format === 'boolean-int') {
		return value ? true : false
	}

	return value
}

export {
	type PieceFrontmatterJtdSchema,
	type PieceFrontmatter,
	type PieceFrontmatterFields,
	type PieceFrontmatterLuzzleMetadata,
	type PieceFrontmatterSchemaField,
	getPieceFrontmatterKeysFromSchema,
	formatPieceFrontmatterValue,
	unformatPieceFrontmatterValue,
	extractFrontmatterSchemaField,
}
