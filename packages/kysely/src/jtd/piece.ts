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

type PieceFrontmatterFields = Record<string, string | string[] | number | boolean | undefined>

type PieceDatabaseJtdSchema<T extends PieceSelectable> = JTDSchemaType<NullToPartials<T>>

type PieceFrontmatter<
	DataBaseFields extends Omit<PieceSelectable, keyof PieceSelectable>,
	FrontmatterOnlyFields extends PieceFrontmatterFields | void = void
> = NullToPartials<IncludeIfExists<DataBaseFields, FrontmatterOnlyFields>>

type PieceFrontmatterFieldFormats = 'date-string' | 'attachment' | 'boolean-int'

type PieceFrontmatterSchemaField = {
	name: string
	collection?: 'array' | 'object'
	type?:
		| JTDSchemaType<string, Record<string, never>>['type']
		| JTDSchemaType<number, Record<string, never>>['type']
		| JTDSchemaType<boolean, Record<string, never>>['type']
	metadata?: {
		format: PieceFrontmatterFieldFormats
		pattern?: string
		enum?: string[]
	}
	nullable?: boolean
}

type PieceFrontmatterJtdSchema<
	M extends PieceFrontmatter<
		Omit<PieceSelectable, keyof PieceSelectable>,
		void | PieceFrontmatterFields
	>
> = JTDSchemaType<M>

function getPieceSchemaKeys<M>(schema: JTDSchemaType<M>): Array<PieceFrontmatterSchemaField> {
	const x = {
		...('properties' in schema ? schema.properties : {}),
		...('optionalProperties' in schema ? schema.optionalProperties : {}),
	} as { [key: string]: SomeJTDSchemaType }

	const fields: Array<PieceFrontmatterSchemaField> = []

	for (const [key, value] of Object.entries(x)) {
		if ('elements' in value && 'type' in value.elements) {
			fields.push({
				name: key,
				type: value.elements.type,
				collection: 'array',
				metadata: {
					format: value.elements.metadata?.luzzleFormat,
					pattern: value.elements.metadata?.luzzlePattern,
					enum: value.elements.metadata?.luzzleEnum,
				} as PieceFrontmatterSchemaField['metadata'],
				nullable: value.elements.nullable,
			})
		} else if ('properties' in value) {
			fields.push({
				name: key,
				collection: 'object',
				nullable: value.nullable,
			})
		} else if ('type' in value) {
			fields.push({
				name: key,
				type: value.type,
				metadata: {
					format: value.metadata?.luzzleFormat,
					pattern: value.metadata?.luzzlePattern,
					enum: value.metadata?.luzzleEnum,
				} as PieceFrontmatterSchemaField['metadata'],
				nullable: value.nullable,
			})
		} else {
			throw new Error(`invalid schema at key ${key}`)
		}
	}

	return fields
}

function frontmatterToDatabaseValue(value: unknown, format?: PieceFrontmatterFieldFormats) {
	if (format === 'date-string') {
		return new Date(value as string).getTime()
	} else if (format === 'boolean-int') {
		return value ? 1 : 0
	}

	return value
}

function databaseToFrontmatterValue(value: unknown, format?: PieceFrontmatterFieldFormats) {
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
	type PieceFrontmatterFieldFormats,
	type PieceFrontmatterSchemaField,
	getPieceSchemaKeys,
	frontmatterToDatabaseValue,
	databaseToFrontmatterValue,
}
