import { PieceSelectable, PieceFrontmatter, PieceFrontmatterFields } from '@luzzle/kysely'
import Ajv, { ValidateFunction } from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../md.js'

export type PieceMarkdown<
	F extends PieceFrontmatter<Partial<PieceSelectable>, void | PieceFrontmatterFields>
> = {
	slug: string
	note?: string | null
	frontmatter: F
}

export class PieceMarkdownError<Y> extends Error {
	validationErrors: ValidateFunction<Y>['errors']

	constructor(message: string, errors: ValidateFunction<Y>['errors']) {
		super(message)
		this.name = 'PieceMarkdownError'
		this.validationErrors = errors
	}
}

export function toValidatedMarkdown<
	F extends PieceFrontmatter<Partial<PieceSelectable>, void | PieceFrontmatterFields>
>(
	slug: string,
	markdown: string | undefined | null,
	frontmatter: Record<string, unknown>,
	validator: Ajv.ValidateFunction<F>
): PieceMarkdown<F> {
	if (validator(frontmatter)) {
		return toMarkdown(slug, markdown, frontmatter)
	}

	const pieceValidationError = new PieceMarkdownError(
		`${slug} is not a valid piece`,
		validator.errors
	)

	throw pieceValidationError
}

export function toMarkdown<
	F extends PieceFrontmatter<Partial<PieceSelectable>, void | PieceFrontmatterFields>
>(slug: string, markdown: string | undefined | null, frontmatter: F): PieceMarkdown<F> {
	return { slug, frontmatter, note: markdown }
}

export function toMarkdownString<
	T extends PieceFrontmatter<Partial<PieceSelectable>, void | PieceFrontmatterFields>
>(markdown: PieceMarkdown<T>): string {
	return addFrontMatter(markdown.note, markdown.frontmatter)
}
