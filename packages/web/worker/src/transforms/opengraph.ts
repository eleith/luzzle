import path from 'node:path'
import { promises as fs } from 'node:fs'
import { getOpenGraphPath } from '../assets/paths.js'
import { renderOpengraphPng } from '../pieces/render.js'
import { getWorkerContext } from '../services/context.js'
import type { TransformInput, AssetRecord } from './utils/types.js'
import type { PublicWebPiece, PublicWebPieceAsset } from '../pieces/helpers.js'
import type { PieceFrontmatter } from '@luzzle/core'

export async function run({
	webPiece,
	config,
	outDir,
	previewAssets
}: TransformInput): Promise<AssetRecord[]> {
	const ogPath = getOpenGraphPath(webPiece.type, webPiece.key)
	const outputPath = path.join(outDir, ogPath)

	let assets: PublicWebPieceAsset[] = []

	if (previewAssets) {
		assets = previewAssets.map((a) => ({
			asset_key: a.asset_key,
			transformation: a.transformation,
			asset_path: a.asset_path ?? null,
			mime_type: a.mime_type,
			is_embedded: a.is_embedded ?? undefined,
			content: a.content ?? undefined
		}))
	} else {
		const db = getWorkerContext().db
		const dbAssets = await db
			.selectFrom('web_pieces_assets')
			.selectAll()
			.where('piece_file_path', '=', webPiece.file_path)
			.execute()
		assets = dbAssets.map((a) => ({
			asset_key: a.asset_key,
			transformation: a.transformation,
			asset_path: a.asset_path,
			mime_type: a.mime_type,
			is_embedded: a.is_embedded ?? undefined,
			content: a.content ?? undefined
		}))
	}

	const metadata = JSON.parse(webPiece.json_metadata) as PieceFrontmatter
	const publicAssets: PublicWebPieceAsset[] = assets

	const publicPiece: PublicWebPiece = {
		id: webPiece.id,
		key: webPiece.key,
		title: webPiece.title,
		slug: webPiece.slug,
		note: webPiece.note,
		date_updated: webPiece.date_updated,
		date_added: webPiece.date_added,
		date_consumed: webPiece.date_consumed,
		type: webPiece.type,
		summary: webPiece.summary,
		keywords: webPiece.keywords,
		metadata,
		assets: publicAssets
	}

	const buffer = await renderOpengraphPng(publicPiece, config, outDir)

	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, buffer)

	return [{ transformation: 'opengraph', asset_path: ogPath, mime_type: 'image/png' }]
}
