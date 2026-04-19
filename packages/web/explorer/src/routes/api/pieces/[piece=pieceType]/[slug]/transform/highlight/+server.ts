import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssetsInternal } from '$lib/pieces/assets.server'
import { config } from '$lib/server/config'
import { codeToHtml } from 'shiki'
import { getLang } from '$lib/pieces/preview/transforms/highlight-lang'
import fs from 'node:fs/promises'
import path from 'node:path'

export const GET: RequestHandler = async ({ params, url }) => {
	const type = params.piece
	const slug = params.slug
	const attachment = url.searchParams.get('attachment')

	if (!attachment) {
		return error(400, 'attachment query param is required')
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

	const piece = await hydrateWithAssetsInternal(webPiece)
	const asset = piece.assets.find(
		(a) => a.asset_key === attachment && a.transformation === 'attachment'
	)

	if (!asset?.asset_path || !asset.piece_asset_path) {
		return error(404, 'attachment not found in DB')
	}

	const lang = getLang(asset.piece_asset_path) || 'text'
	const assetsDir = path.resolve('assets/pieces')
	const filePath = path.join(assetsDir, asset.asset_path)
	const code = await fs.readFile(filePath, 'utf-8')

	const html = await codeToHtml(code, {
		lang,
		defaultColor: false,
		themes: {
			light: config.theme.markdown.code.light,
			dark: config.theme.markdown.code.dark
		}
	})

	return new Response(html, {
		headers: { 'content-type': 'text/html' }
	})
}
