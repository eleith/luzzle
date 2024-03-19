import Ajv, { ValidateFunction } from 'ajv/dist/jtd.js'
import { addFrontMatter } from '../../lib/frontmatter.js'
import { PieceFrontmatter, PieceFrontmatterFields } from './frontmatter.js'
import { PieceSelectable } from '../tables.schema.js'

type PieceMarkdown<F extends PieceFrontmatter<PieceSelectable, void | PieceFrontmatterFields>> = {
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

function makePieceMarkdownOrThrow<
	F extends PieceFrontmatter<PieceSelectable, void | PieceFrontmatterFields>
>(
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

function makePieceMarkdown<
	F extends PieceFrontmatter<PieceSelectable, void | PieceFrontmatterFields>
>(slug: string, markdown: string | undefined | null, frontmatter: F): PieceMarkdown<F> {
	return { slug, frontmatter, note: markdown }
}

function makePieceMarkdownString<
	T extends PieceFrontmatter<PieceSelectable, void | PieceFrontmatterFields>
>(markdown: PieceMarkdown<T>): string {
	return addFrontMatter(markdown.note, markdown.frontmatter)
}

export {
	type PieceMarkdown,
	PieceMarkdownError,
	makePieceMarkdownOrThrow,
	makePieceMarkdown,
	makePieceMarkdownString,
}
