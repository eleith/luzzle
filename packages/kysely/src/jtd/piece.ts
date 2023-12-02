import { JTDSchemaType, SomeJTDSchemaType } from 'ajv/dist/core.js'
import { PieceSelectable } from '../tables/pieces.js'

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

type PieceFrontmatterFields = Record<string, string | number | boolean | undefined>

type PieceDatabaseJtdSchema<T extends PieceSelectable> = JTDSchemaType<NullToPartials<T>>

type PieceFrontmatter<
	DataBaseFields extends Omit<PieceSelectable, keyof PieceSelectable>,
	FrontmatterOnlyFields extends PieceFrontmatterFields | void = void
> = NullToPartials<IncludeIfExists<DataBaseFields, FrontmatterOnlyFields>>

type PieceFrontmatterFrontMatterFieldFormats = 'date-string' | 'attachment' | 'boolean-int'
type PieceFieldSchemaTypes =
	| 'float32'
	| 'float64'
	| 'int8'
	| 'uint8'
	| 'int16'
	| 'uint16'
	| 'int32'
	| 'uint32'
	| 'string'
	| 'timestamp'
	| 'boolean'

type PieceDatabaseSchemaField = {
	name: string
	type: PieceFieldSchemaTypes
}

type PieceFrontmatterSchemaField = {
	format?: PieceFrontmatterFrontMatterFieldFormats
	pattern?: string
	enum?: string[]
} & PieceDatabaseSchemaField

type PieceFrontmatterJtdSchema<
	M extends PieceFrontmatter<
		Omit<PieceSelectable, keyof PieceSelectable>,
		void | PieceFrontmatterFields
	>
> = JTDSchemaType<M>

function getDatabaseFieldSchemas(schema: SomeJTDSchemaType): Array<PieceDatabaseSchemaField> {
	const x = {
		...(schema as JTDSchemaType<{ _: string }>).properties,
		...(schema as JTDSchemaType<{ _: string }>).optionalProperties,
	}

	const fields: Array<PieceDatabaseSchemaField> = []

	for (const [k, v] of Object.entries(x)) {
		fields.push({
			name: k,
			type: v.type,
		})
	}

	return fields
}

function getFrontmatterFieldSchemas(schema: SomeJTDSchemaType): Array<PieceFrontmatterSchemaField> {
	const x = {
		...(schema as JTDSchemaType<{ _: string }>).properties,
		...(schema as JTDSchemaType<{ _: string }>).optionalProperties,
	}

	const fields: Array<PieceFrontmatterSchemaField> = []

	for (const [k, v] of Object.entries(x)) {
		fields.push({
			name: k,
			type: v.type,
			format: v.metadata?.luzzleFormat as PieceFrontmatterFrontMatterFieldFormats | undefined,
			pattern: v.metadata?.luzzlePattern as string | undefined,
			enum: v.metadata?.luzzleEnum as string[] | undefined,
		})
	}

	return fields
}

function frontmatterToDatabaseValue(
	value: unknown,
	format?: PieceFrontmatterFrontMatterFieldFormats
) {
	if (format === 'date-string') {
		return new Date(value as string).getTime()
	} else if (format === 'boolean-int') {
		return value ? 1 : 0
	}

	return value
}

function databaseToFrontmatterValue(
	value: unknown,
	format?: PieceFrontmatterFrontMatterFieldFormats
) {
	if (format === 'date-string') {
		return new Date(value as number).toISOString()
	} else if (format === 'boolean-int') {
		return value ? true : false
	}

	return value
}

export {
	type PieceFrontmatterJtdSchema,
	type PieceDatabaseJtdSchema,
	type PieceFrontmatter,
	type PieceFrontmatterFields,
	type PieceFrontmatterFrontMatterFieldFormats,
	type PieceFrontmatterSchemaField,
	type PieceDatabaseSchemaField,
	getDatabaseFieldSchemas,
	getFrontmatterFieldSchemas,
	frontmatterToDatabaseValue,
	databaseToFrontmatterValue,
}
