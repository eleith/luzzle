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
type IncludeIfExists<A, B> = B extends void ? A : A & B

type PieceFrontMatterFields = Record<string, string | number | boolean | undefined>

type PieceType<T> = NullToPartials<T>

type PieceDatabaseJtdSchema<T extends PieceSelectable> = JTDSchemaType<PieceType<T>>

type PieceMarkdown<
	DataBaseFields extends Partial<PieceSelectable>,
	FrontMatterOnlyFields extends PieceFrontMatterFields | void = void
> = {
	slug: string
	markdown?: string
	frontmatter: PieceType<IncludeIfExists<DataBaseFields, FrontMatterOnlyFields>>
}

type PieceMarkdownJtdSchema<
	M extends PieceMarkdown<Partial<PieceSelectable>, void | PieceFrontMatterFields>
> = JTDSchemaType<M>

export {
	type PieceMarkdownJtdSchema,
	type PieceDatabaseJtdSchema,
	type PieceMarkdown,
	type PieceType,
	type PieceFrontMatterFields,
}
