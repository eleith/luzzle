import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssetsInternal } from '$lib/pieces/assets.server'
import { config } from '$lib/server/config'
import { codeToHtml, bundledLanguagesInfo } from 'shiki'
import fs from 'node:fs/promises'
import path from 'node:path'

const extToLang = new Map<string, string>()
for (const lang of bundledLanguagesInfo) {
	extToLang.set(lang.id, lang.id)
	for (const alias of lang.aliases ?? []) {
		extToLang.set(alias, lang.id)
	}
}

function getLang(filename: string): string | null {
	const dot = filename.lastIndexOf('.')
	const ext = dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
	return extToLang.get(ext) ?? null
}

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

	const lang = getLang(asset.piece_asset_path)
	if (!lang) {
		return error(404, 'attachment is not a recognised code file')
	}

	const assetsDir = path.resolve('assets/pieces')
	const filePath = path.join(assetsDir, asset.asset_path)
	const code = await fs.readFile(filePath, 'utf-8')

	const html = await codeToHtml(code, {
		lang,
		themes: {
			light: config.theme.markdown.code.light,
			dark: config.theme.markdown.code.dark
		}
	})

	return new Response(html, {
		headers: { 'content-type': 'text/html' }
	})
}
