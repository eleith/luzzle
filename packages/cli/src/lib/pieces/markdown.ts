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

export type PieceMarkDown<
	DataBaseFields extends PieceSelectable,
	DataBaseOnlyFields extends keyof DataBaseFields,
	// eslint-disable-next-line @typescript-eslint/ban-types
	FrontMatterOnlyFields extends PieceFrontMatterFields = {}
> = {
	slug: string
	markdown?: string
	frontmatter: FrontMatterOnlyFields &
		Omit<
			Pick<DataBaseFields, NonNullableKeys<DataBaseFields>> &
				Partial<UnNullify<Pick<DataBaseFields, NullableKeys<DataBaseFields>>>>,
			DataBaseOnlyFields
		>
}

export function toValidatedMarkDown<
	Y extends PieceMarkDown<
		PieceSelectable,
		keyof PieceSelectable,
		Record<string, string | number | boolean | undefined>
	>
>(
	slug: string,
	markdown: string | undefined,
	frontmatter: Y['frontmatter'],
	validator: Ajv.ValidateFunction<Y>
): Y {
	const md = {
		slug,
		frontmatter,
		markdown,
	} as Y

	if (validator(md)) {
		return md
	}

	const pieceValidationError = new PieceMarkdownError(
		`${slug} is not a valid piece`,
		validator.errors
	)

	throw pieceValidationError
}

export function toMarkDownString<
	T extends PieceSelectable,
	K extends keyof T,
	M extends Record<string, string | number | undefined>
>(markdown: PieceMarkDown<T, K, M>): string {
	return addFrontMatter(markdown.markdown, markdown.frontmatter)
}
