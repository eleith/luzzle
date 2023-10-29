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

export type PieceMarkDown<T extends PieceSelectable, K extends keyof T> = {
	slug: string
	markdown?: string
	frontmatter: Omit<Pick<T, NonNullableKeys<T>> & Partial<UnNullify<Pick<T, NullableKeys<T>>>>, K>
}

export function toValidatedMarkDown<
	Y extends PieceMarkDown<PieceSelectable, keyof PieceSelectable>
>(slug: string, markdown: unknown, frontmatter: unknown, validator: Ajv.ValidateFunction<Y>): Y {
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

export function toMarkDownString<T extends PieceSelectable, K extends keyof T>(
	markdown: PieceMarkDown<T, K>
): string {
	return addFrontMatter(markdown.markdown, markdown.frontmatter)
}
