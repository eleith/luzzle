import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssetsInternal } from '$lib/pieces/assets.server'
import { getPalette } from '@luzzle/web.utils/server'
import fs from 'node:fs/promises'
import path from 'node:path'

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
	const asset = piece.assets.find((a) => a.transformation === 'image.m.jpg')

	if (!asset?.asset_path) {
		return error(404, 'medium image variant not found')
	}

	const assetsDir = path.resolve('assets/pieces')
	const filePath = path.join(assetsDir, asset.asset_path)
	const buffer = await fs.readFile(filePath)
	const palette = await getPalette(buffer)

	return json(palette)
}
