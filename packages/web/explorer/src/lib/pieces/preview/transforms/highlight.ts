import { getFrontmatterValues } from '@luzzle/core'
import { codeToHtml } from 'shiki'
import { config } from '$lib/server/config.js'
import { getLang } from './highlight-lang.js'
import type { PreviewAssetRecord, PreviewContext, PreviewResolver } from './types.js'

async function resolve(context: PreviewContext): Promise<PreviewAssetRecord[]> {
	const { frontmatter, pieceConfig, pieces, pathToKey } = context
	const attachmentFields = pieceConfig.fields.attachments
	if (!attachmentFields) return []

	const records: PreviewAssetRecord[] = []

	for (const field of attachmentFields) {
		const paths = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)

		for (const assetPath of paths) {
			const lang = getLang(assetPath) || 'text'

			const assetKey = pathToKey.get(assetPath)
			if (!assetKey) continue

			try {
				const buffer = await pieces.getPieceAsset(assetPath)
				const code = buffer.toString('utf-8')
				const html = await codeToHtml(code, {
					lang,
					defaultColor: false,
					themes: {
						light: config.theme.markdown.code.light,
						dark: config.theme.markdown.code.dark
					}
				})

				records.push({
					asset_key: assetKey,
					transformation: 'highlight',
					piece_asset_path: assetPath,
					asset_path: null,
					mime_type: 'text/html',
					is_embedded: 1,
					content: html
				})
			} catch (err) {
				console.warn(`[highlight] failed to highlight ${assetPath}:`, err)
				continue
			}
		}
	}

	return records
}

export const highlightResolver: PreviewResolver = { name: 'highlight', resolve }
