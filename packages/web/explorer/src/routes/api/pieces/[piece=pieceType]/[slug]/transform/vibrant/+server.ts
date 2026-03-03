import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssets } from '$lib/pieces/assets.server'
import { config } from '$lib/server/config'
import { getPalette } from '@luzzle/web.utils/server'
import fs from 'node:fs/promises'
import path from 'node:path'

export const GET: RequestHandler = async ({ params }) => {
	const type = params.piece
	const slug = params.slug

	const pieceConfig = config.pieces.find((p) => p.type === type)
	const firstMediaField = pieceConfig?.fields.media?.[0]
	if (!firstMediaField) {
		return error(404, 'no media field configured for this piece type')
	}

	const webPiece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!webPiece) {
		return error(404, 'piece does not exist')
	}

	const metadata = JSON.parse(webPiece.json_metadata || '{}')
	const imageFilename = metadata[firstMediaField] as string | undefined
	if (!imageFilename) {
		return error(404, 'no image in media field')
	}

	const piece = await hydrateWithAssets(webPiece)
	const asset = piece.assets.find(
		(a) => a.piece_asset_path === imageFilename && a.transformation === 'image.m.jpg'
	)

	if (!asset?.asset_path) {
		return error(404, 'medium image variant not found')
	}

	const assetsDir = path.resolve('assets/pieces')
	const filePath = path.join(assetsDir, asset.asset_path)
	const buffer = await fs.readFile(filePath)
	const palette = await getPalette(buffer)

	return json(palette)
}
