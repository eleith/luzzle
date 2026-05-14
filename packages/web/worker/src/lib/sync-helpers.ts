import { getFrontmatterValue, type LuzzleSelectable } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../db.js'
import { generateAssetKey } from '../assets/key.js'

export function slugify(text: string): string {
	return text
		.toString()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')
}

export function generateUniqueSlug(usedSlugs: Set<string>, filename: string): string {
	const base = slugify(filename)
	let candidate = base
	let n = 1
	while (usedSlugs.has(candidate)) {
		candidate = `${base}--${n}`
		n++
	}
	usedSlugs.add(candidate)
	return candidate
}

export function sanitizeMetadata(jsonMetadata: string, pathToKey: Map<string, string>): string {
	if (pathToKey.size === 0) return jsonMetadata
	return JSON.stringify(
		JSON.parse(jsonMetadata, (_key, value) => {
			if (typeof value === 'string' && pathToKey.has(value)) {
				return pathToKey.get(value)
			}
			return value
		})
	)
}

export function buildWebPiece(
	item: LuzzleSelectable<'pieces_items'>,
	pieceConfig: Config['pieces'][number],
	slug: string,
	salt: string,
	frontmatter: ReturnType<typeof JSON.parse>,
	keywords: string[]
): WebPieces {
	const title = getFrontmatterValue<string>(frontmatter, pieceConfig.fields.title) || ''
	const dateConsumed = getFrontmatterValue<number>(frontmatter, pieceConfig.fields.date_consumed)
	const key = generateAssetKey(item.file_path, salt)

	const summary = pieceConfig.fields.summary
		? getFrontmatterValue<string>(frontmatter, pieceConfig.fields.summary)
		: undefined

	return {
		slug,
		type: item.type as WebPieces['type'],
		id: item.id,
		key,
		file_path: item.file_path,
		title,
		summary,
		note: item.note_markdown,
		keywords: keywords.length > 0 ? JSON.stringify(keywords) : undefined,
		date_added: item.date_added,
		date_consumed: dateConsumed,
		json_metadata: item.frontmatter_json,
		...(item.date_updated && { date_updated: item.date_updated }),
	}
}
