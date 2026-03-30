import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssetsInternal } from '$lib/pieces/assets.server'
import { getPalette } from '$lib/server/palette'
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '$lib/server/config'

export const GET: RequestHandler = async ({ params }) => {
	const type = params.piece
	const slug = params.slug

	const webPiece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!webPiece) {
		return error(404, 'piece does not exist')
	}

	const piece = await hydrateWithAssetsInternal(webPiece)
	const field = config.pieces.find((p) => p.type === piece.type)?.fields.media?.[0]
	const assets = piece.assets
		.filter((a) => a.transformation === 'image.original')
		.filter((a) => a.piece_field_path === field)

	const assetPath = assets?.[0]?.asset_path

	if (!assetPath) {
		return error(404, 'piece media not found')
	}

	const assetsDir = path.resolve('assets/pieces')
	const filePath = path.join(assetsDir, assetPath)
	const buffer = await fs.readFile(filePath)
	const palette = await getPalette(buffer)

	return json(palette)
}
