import path from 'node:path'
import { promises as fs } from 'node:fs'
import sharp from 'sharp'
import { getOpenGraphPath } from '../assets/paths.js'
import { renderOpengraphPng } from '../pieces/render.js'
import type { TransformInput, AssetRecord } from './utils/types.js'
import type { PieceFrontmatter } from '@luzzle/core'
import type { PublicWebPiece } from '@luzzle/web.pieces'

export async function run({
	webPiece,
	config,
	outDir,
	priorAssets
}: TransformInput): Promise<AssetRecord[]> {
	const ogPath = getOpenGraphPath(webPiece.type, webPiece.key)
	const outputPath = path.join(outDir, ogPath)

	const assets = priorAssets ?? []

	const metadata = JSON.parse(webPiece.json_metadata) as PieceFrontmatter

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
		assets
	}

	const buffer = await renderOpengraphPng(publicPiece, assets, config, outDir)
	const optimized = await sharp(buffer)
		.png({ palette: true, quality: 90, effort: 7, compressionLevel: 9 })
		.toBuffer()
	const output = optimized.length < buffer.length ? optimized : buffer

	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, output)

	return [{ transformation: 'opengraph', asset_path: ogPath, mime_type: 'image/png' }]
}
