import { getFrontmatterValues } from '@luzzle/core'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { getPalette } from '$lib/server/palette'
import type { PreviewAssetRecord, PreviewContext, PreviewResolver } from './types.js'

async function resolve(context: PreviewContext): Promise<PreviewAssetRecord[]> {
	const { frontmatter, pieceConfig, config, pieces, filePath } = context
	const mediaFields = pieceConfig.fields.media
	if (!mediaFields || mediaFields.length === 0) return []

	const field = mediaFields[0]
	const paths = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
	const firstImagePath = paths[0]
	if (!firstImagePath) return []

	try {
		const buffer = await pieces.getPieceAsset(firstImagePath)
		const palette = await getPalette(buffer)
		const fileKey = generateAssetKey(filePath, config.assets.salt)

		return [
			{
				asset_key: fileKey,
				transformation: 'palette',
				asset_path: null,
				mime_type: 'application/json',
				is_embedded: 1,
				content: JSON.stringify(palette)
			}
		]
	} catch (err) {
		console.warn(`[palette] failed to extract palette for ${filePath}:`, err)
		return []
	}
}

export const paletteResolver: PreviewResolver = { name: 'palette', resolve }
