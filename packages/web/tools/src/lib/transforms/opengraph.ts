import path from 'path'
import { getOpenGraphPath } from '@luzzle/web.utils'
import { getBrowser, closeBrowser } from '../utils/browser.js'
import { generatePngFromUrl } from '../utils/png.js'
import type { TransformInput, AssetRecord } from './types.js'

export async function run({ webPiece, config, outDir }: TransformInput): Promise<AssetRecord[]> {
	const host = config.url.app
	const ogPath = getOpenGraphPath(webPiece.type, webPiece.key)
	const outputPath = path.join(outDir, ogPath)
	const url = `${host}/api/pieces/${webPiece.type}/${webPiece.slug}/opengraph?mode=local`

	try {
		const browser = await getBrowser()
		await generatePngFromUrl(url, browser, outputPath)
		console.log(`[opengraph] generated for ${webPiece.file_path}`)
		return [{ transformation: 'opengraph', asset_path: ogPath, mime_type: 'image/png' }]
	} catch (error) {
		console.error(`[error] opengraph for ${webPiece.file_path}: ${error}`)
		return []
	}
}

export async function cleanup(): Promise<void> {
	await closeBrowser()
}
