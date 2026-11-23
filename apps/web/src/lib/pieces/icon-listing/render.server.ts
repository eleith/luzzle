import type { PublicWebPiece } from '@luzzle/web.pieces'
import { iconListingPlacement } from './placement.js'
import type { AppConfig } from '#lib/server/config.js'
import { loadPublishedIcon } from '#lib/server/templates/icon.js'

/** Two types can share a template file but have different field mappings. */
async function loadDesignsByPieceType(pieces: PublicWebPiece[], config: AppConfig) {
	const types = new Set(pieces.map((piece) => piece.type))
	const entries = await Promise.all(
		Array.from(types, async (type) => [type, await loadPublishedIcon(type, config)] as const)
	)
	return new Map(entries)
}

export async function renderIconListing(pieces: PublicWebPiece[], config: AppConfig) {
	const designsByType = await loadDesignsByPieceType(pieces, config)
	const styles = new Set<string>()
	let rendered = false
	const html = pieces.map((piece, index) => {
		const design = designsByType.get(piece.type)
		if (!design) return null
		try {
			const fragment = design.render(piece, iconListingPlacement(index))
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
