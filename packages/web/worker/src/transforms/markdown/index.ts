import { filterFrontmatterFields, getFrontmatterValues, resolveFieldPaths } from '@luzzle/core'
import type { PieceFrontmatterProperty } from '@luzzle/core'
import { encodeAssetPath } from '@luzzle/web.pieces'
import { processMarkdown } from './engine.js'
import type { AssetUrls } from './rehype-asset-urls.js'
import type { TransformInput, AssetRecord } from '../utils/types.js'

const isMarkdown = (f: PieceFrontmatterProperty) => f.type === 'string' && f.format === 'markdown'

export async function run(input: TransformInput): Promise<AssetRecord[]> {
	const { webPiece, config } = input
	const assets = createMarkdownAssets(input)
	const render = (markdown: string) => processMarkdown(markdown, config.theme.markdown.code, assets)
	const records: AssetRecord[] = []

	if (webPiece.note) {
		const html = await render(webPiece.note)
		records.push({
			transformation: 'markdown',
			piece_asset_path: null,
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: html,
		})
	}

	records.push(...(await renderMarkdownFields(input, render)))
	return records
}

function createMarkdownAssets({
	webPiece,
	assetKeyToPath,
	priorAssets = [],
	buildAssetUrl,
	logger,
}: TransformInput): AssetUrls {
	const urls = new Map<string, string>()
	for (const asset of priorAssets) {
		if (asset.transformation !== 'attachment' && asset.transformation !== 'image.original') continue
		const source = assetKeyToPath.get(asset.asset_key)
		if (!source || !asset.asset_path || !encodeAssetPath(source)) continue

		// Markdown preserves URI punctuation such as '+'; output URLs still encode each segment.
		const destination = encodeURI(source).replace(/[?#]/g, encodeURIComponent)
		const url = buildAssetUrl?.(asset.asset_path)
		if (destination && url) urls.set(destination, url)
	}
	return {
		urls,
		warn: (destination) =>
			logger.warn('Markdown asset has no generated original file', {
				file: webPiece.file_path,
				asset: destination,
			}),
	}
}

async function renderMarkdownFields(
	{ webPiece, pieces }: TransformInput,
	render: (markdown: string) => Promise<string>
): Promise<AssetRecord[]> {
	const records: AssetRecord[] = []
	const piece = await pieces.getPiece(webPiece.type)
	const schemaPaths = filterFrontmatterFields(piece.fields, isMarkdown)
	const frontmatter = JSON.parse(webPiece.json_metadata || '{}')

	for (const schemaPath of schemaPaths) {
		const dataPaths = resolveFieldPaths(piece.fields, frontmatter, schemaPath)

		for (const fieldPath of dataPaths) {
			const values = getFrontmatterValues<string>(frontmatter, fieldPath).flat()
			const value = values[0]
			if (typeof value !== 'string' || !value) continue

			const html = await render(value)
			records.push({
				transformation: `markdown.${fieldPath}`,
				piece_asset_path: null,
				piece_field_path: fieldPath,
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: html,
			})
		}
	}

	return records
}
