import type { PublicWebPiece } from '@luzzle/web.pieces'
import type { AppConfig } from '#lib/server/config.js'
import { loadPublishedIcon, type IconImageProps } from '#lib/server/templates/icon.js'

/** Two types can share a template file but have different field mappings. */
async function loadDesignsByPieceType(rows: IconRow[], config: AppConfig) {
	const types = new Set(rows.map(({ piece }) => piece.type))
	const entries = await Promise.all(
		Array.from(types, async (type) => {
			const design = await loadPublishedIcon(type, config)
			return [type, design] as const
		})
	)
	return new Map(entries)
}

type IconRow = { piece: PublicWebPiece } & IconImageProps

export async function renderPieceIcons(rows: IconRow[], config: AppConfig) {
	const designsByType = await loadDesignsByPieceType(rows, config)
	const styles = new Set<string>()
	let rendered = false
	const html = rows.map(({ piece, size, lazy }) => {
		const design = designsByType.get(piece.type)
		if (!design) return null
		try {
			const fragment = design.render(piece, { size, lazy })
			rendered = true
			if (design.css) styles.add(design.css)
			return fragment
		} catch (cause) {
			console.error(`Cannot render listing icon for ${piece.type}/${piece.slug}`, cause)
			return null
		}
	})
	return rendered ? { html, stylesheets: [...styles] } : undefined
}
