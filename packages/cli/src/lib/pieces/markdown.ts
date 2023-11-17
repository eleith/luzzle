import { PieceSelectable, PieceMarkdown } from '@luzzle/kysely'
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
	markdown: PieceMarkdown<T, keyof T>
): string {
	return addFrontMatter(markdown.markdown, markdown.frontmatter)
}
