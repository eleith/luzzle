import { addFrontMatter } from '../../lib/frontmatter.js'
import { PieceFrontmatter } from './frontmatter.js'

type PieceMarkdown<F extends PieceFrontmatter> = {
	filePath: string
	piece: string
	note?: string
	frontmatter: F
}

function makePieceMarkdown<F extends PieceFrontmatter>(
	filePath: string,
	piece: string,
	note: string | undefined,
	frontmatter: F
): PieceMarkdown<F> {
	return { filePath, piece, frontmatter, note }
}

function makePieceMarkdownString<T extends PieceFrontmatter>(markdown: PieceMarkdown<T>): string {
	return addFrontMatter(markdown.note, markdown.frontmatter)
}

export { type PieceMarkdown, makePieceMarkdown, makePieceMarkdownString }
