import path from 'node:path'
import { getFrontmatterValues } from '@luzzle/core'
import { codeToHtml } from 'shiki'
import { getLang } from './lang.js'
import { readHighlightSource } from './source.js'
import type { TransformInput, AssetRecord } from '../utils/types.js'

const MAX_HTML_BYTES = 512 * 1024

type HighlightAttachment = { source: string; filename: string }

export async function run(input: TransformInput): Promise<AssetRecord[]> {
	const records: AssetRecord[] = []
	for (const { source, filename } of selectHighlightAttachments(input)) {
		const skip = (reason: string) => warnSkipped(input, source, reason)
		const code = await readHighlightSource(filename, skip)
		if (code === undefined) continue

		const lang = getLang(source) || 'text'
		const html = await codeToHtml(code, {
			lang,
			defaultColor: false,
			themes: input.config.theme.markdown.code,
		})
		if (Buffer.byteLength(html) > MAX_HTML_BYTES) {
			skip(`generated HTML exceeds ${MAX_HTML_BYTES} bytes`)
			continue
		}

		records.push({
			transformation: 'highlight',
			piece_asset_path: source,
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: html,
		})
	}
	return records
}

function selectHighlightAttachments(input: TransformInput): HighlightAttachment[] {
	const { webPiece, config, outDir, assetKeyToPath, priorAssets = [] } = input
	const selectors = config.pieces.find((piece) => piece.type === webPiece.type)?.fields.highlight
	if (!selectors?.length) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)
	const selectedKeys = new Set(
		selectors.flatMap((field) => getFrontmatterValues<string>(frontmatter, field).flat())
	)
	const attachments = new Map(
		priorAssets
			.filter((asset) => asset.transformation === 'attachment')
			.map((asset) => [asset.asset_key, asset])
	)
	const selected: HighlightAttachment[] = []

	for (const key of selectedKeys) {
		const source = assetKeyToPath.get(key)
		const attachment = attachments.get(key)
		if (!source || !attachment?.asset_path) {
			warnSkipped(input, source || key, 'not a registered, generated attachment')
			continue
		}
		selected.push({ source, filename: path.join(outDir, attachment.asset_path) })
	}
	return selected
}

function warnSkipped({ webPiece, logger }: TransformInput, asset: string, reason: string): void {
	logger.warn('Highlight skipped', { file: webPiece.file_path, asset, reason })
}
