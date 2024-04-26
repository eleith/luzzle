import Ajv, { ValidateFunction } from 'ajv'
import { addFrontMatter } from '../../lib/frontmatter.js'
import { PieceFrontmatter } from './frontmatter.js'

type PieceMarkdown<F extends PieceFrontmatter> = {
	slug: string
	note?: string | null
	frontmatter: F
}

class PieceMarkdownError<Y> extends Error {
	validationErrors: ValidateFunction<Y>['errors']

	constructor(message: string, errors: ValidateFunction<Y>['errors']) {
		super(message)
		this.name = 'PieceMarkdownError'
		this.validationErrors = errors
	}
}

function makePieceMarkdownOrThrow<F extends PieceFrontmatter>(
	slug: string,
	markdown: string | undefined | null,
	frontmatter: Record<string, unknown>,
	validator: Ajv.ValidateFunction<F>
): PieceMarkdown<F> {
	if (validator(frontmatter)) {
		return makePieceMarkdown(slug, markdown, frontmatter)
	}

	const pieceValidationError = new PieceMarkdownError(
		`${slug} is not a valid piece`,
		validator.errors
	)

	throw pieceValidationError
}

function makePieceMarkdown<F extends PieceFrontmatter>(
	slug: string,
	markdown: string | undefined | null,
	frontmatter: F
): PieceMarkdown<F> {
	return { slug, frontmatter, note: markdown }
}

function makePieceMarkdownString<T extends PieceFrontmatter>(markdown: PieceMarkdown<T>): string {
	return addFrontMatter(markdown.note, markdown.frontmatter)
}

export {
	type PieceMarkdown,
	PieceMarkdownError,
	makePieceMarkdownOrThrow,
	makePieceMarkdown,
	makePieceMarkdownString,
}
