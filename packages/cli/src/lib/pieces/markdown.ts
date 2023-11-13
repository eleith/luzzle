import { PieceSelectable } from '@luzzle/kysely'
import Ajv, { ValidateFunction } from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../md.js'

export class PieceMarkdownError<Y> extends Error {
	validationErrors: ValidateFunction<Y>['errors']

	constructor(message: string, errors: ValidateFunction<Y>['errors']) {
		super(message)
		this.name = 'PieceMarkdownError'
		this.validationErrors = errors
	}
}

export type PieceFrontMatterFields = Record<string, string | number | boolean | undefined>

type NullToPartials<T> = Pick<T, NonNullableKeys<T>> & Partial<UnNullify<Pick<T, NullableKeys<T>>>>
type OmitIfExists<K, T extends void | keyof K> = T extends keyof K ? Omit<K, T> : K
type IncludeIfExists<K, T> = T extends void ? K : T & K

export type PieceMarkDown<
	DataBaseFields extends PieceSelectable,
	DataBaseOnlyFields extends void | keyof DataBaseFields = void,
	FrontMatterOnlyFields extends void | PieceFrontMatterFields = void
> = {
	slug: string
	markdown?: string
	frontmatter: NullToPartials<
		IncludeIfExists<OmitIfExists<DataBaseFields, DataBaseOnlyFields>, FrontMatterOnlyFields>
	>
}

export function toValidatedMarkDown<M>(
	slug: string,
	markdown: string | undefined,
	frontmatter: Record<string, unknown>,
	validator: Ajv.ValidateFunction<M>
): M {
	const md = {
		slug,
		frontmatter,
		markdown,
	}

	if (validator(md)) {
		return md
	}

	const pieceValidationError = new PieceMarkdownError(
		`${slug} is not a valid piece`,
		validator.errors
	)

	throw pieceValidationError
}

export function toMarkDownString<T extends PieceSelectable>(
	markdown: PieceMarkDown<T, keyof T>
): string {
	return addFrontMatter(markdown.markdown, markdown.frontmatter)
}
