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

	const browser = await getBrowser()
	await generatePngFromUrl(url, browser, outputPath)
	return [{ transformation: 'opengraph', asset_path: ogPath, mime_type: 'image/png' }]
}

export async function cleanup(): Promise<void> {
	await closeBrowser()
}
