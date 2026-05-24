import { getFrontmatterValue, getFrontmatterValues, type PieceFrontmatter } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'

type PieceConfig = Config['pieces'][number]

export function resolveFromFrontmatter(
	frontmatter: PieceFrontmatter,
	pieceConfig: PieceConfig
): { title: string; summary?: string; dateConsumed?: number; keywords: string[] } {
	const title = getFrontmatterValue<string>(frontmatter, pieceConfig.fields.title) || ''
	const dateConsumed = getFrontmatterValue<number>(frontmatter, pieceConfig.fields.date_consumed)
	const summary = pieceConfig.fields.summary
		? getFrontmatterValue<string>(frontmatter, pieceConfig.fields.summary)
		: undefined
	const keywords = pieceConfig.fields.tags
		? getFrontmatterValues<string>(frontmatter, pieceConfig.fields.tags).flat().filter(Boolean)
		: []

	return { title, summary, dateConsumed, keywords }
}
