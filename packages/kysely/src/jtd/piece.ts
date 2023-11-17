import { JTDSchemaType } from 'ajv/dist/core.js'
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
type OmitIfExists<K, T extends void | keyof K> = T extends keyof K ? Omit<K, T> : K
type IncludeIfExists<K, T> = T extends void ? K : T & K

type PieceFrontMatterFields = Record<string, string | number | boolean | undefined>

type PieceType<T> = NullToPartials<T>

type PieceDatabaseJtdSchema<T extends PieceSelectable> = JTDSchemaType<PieceType<T>>

type PieceMarkdown<
	DataBaseFields extends PieceSelectable,
	DataBaseOnlyFields extends void | keyof DataBaseFields = void,
	FrontMatterOnlyFields extends void | PieceFrontMatterFields = void
> = {
	slug: string
	markdown?: string
	frontmatter: PieceType<
		IncludeIfExists<OmitIfExists<DataBaseFields, DataBaseOnlyFields>, FrontMatterOnlyFields>
	>
}

type PieceMarkdownJtdSchema<
	M extends PieceMarkdown<
		PieceSelectable,
		keyof PieceSelectable | void,
		void | PieceFrontMatterFields
	>
> = JTDSchemaType<M>

export {
	type PieceMarkdownJtdSchema,
	type PieceDatabaseJtdSchema,
	type PieceMarkdown,
	type PieceType,
	type PieceFrontMatterFields,
}
