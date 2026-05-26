import { getFrontmatterValue, getFrontmatterValues, type PieceFrontmatter } from '@luzzle/core'
import mime from 'mime-types'
import type { Config } from '@luzzle/web.config'
import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'

export type AssembledPreview = {
	piece: PublicWebPiece
	tags: Array<{ slug: string; tag: string }>
}

export type PreviewWorkerAsset = PublicWebPieceAsset & {
	piece_asset_path?: string | null
	piece_field_path?: string | null
}

export type PreviewWorkerResult = {
	filePath: string
	type: string
	slug: string
	pieceKey: string
	sanitizedFrontmatter: PieceFrontmatter
	note: string
	pathToKey: Record<string, string>
	transforms: PreviewWorkerAsset[]
}

function slugify(text: string): string {
	return text
		.toString()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')
}

function imagePassthroughs(
	frontmatter: PieceFrontmatter,
	mediaFields: string[] | undefined,
	keyToPath: Map<string, string>
): PublicWebPieceAsset[] {
	if (!mediaFields?.length) return []
	const records: PublicWebPieceAsset[] = []
	for (const field of mediaFields) {
		const keys = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
		for (const key of keys) {
			const path = keyToPath.get(key)
			if (!path) continue
			const mimeType = mime.lookup(path) || 'application/octet-stream'
			if (!mimeType.startsWith('image/')) continue
			records.push({
				asset_key: key,
				transformation: 'image.original',
				asset_path: path,
				mime_type: mimeType
			})
		}
	}
	return records
}

function attachmentPassthroughs(
	frontmatter: PieceFrontmatter,
	attachmentFields: string[] | undefined,
	keyToPath: Map<string, string>
): PublicWebPieceAsset[] {
	if (!attachmentFields?.length) return []
	const records: PublicWebPieceAsset[] = []
	for (const field of attachmentFields) {
		const keys = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
		for (const key of keys) {
			const path = keyToPath.get(key)
			if (!path) continue
			records.push({
				asset_key: key,
				transformation: 'attachment',
				asset_path: path,
				mime_type: mime.lookup(path) || 'application/octet-stream'
			})
		}
	}
	return records
}

export function assemblePreview(
	result: PreviewWorkerResult,
	pieceConfig: Config['pieces'][number]
): AssembledPreview {
	const fm = result.sanitizedFrontmatter
	const keyToPath = new Map<string, string>()
	for (const [path, key] of Object.entries(result.pathToKey)) {
		keyToPath.set(key, path)
	}

	const title = getFrontmatterValue<string>(fm, pieceConfig.fields.title) || ''
	const summary = pieceConfig.fields.summary
		? getFrontmatterValue<string>(fm, pieceConfig.fields.summary)
		: undefined
	const dateConsumed = getFrontmatterValue<number>(fm, pieceConfig.fields.date_consumed)

	const tagValues = pieceConfig.fields.tags
		? getFrontmatterValues<string>(fm, pieceConfig.fields.tags)
				.flat()
				.filter(Boolean)
				.flatMap((v) =>
					String(v)
						.split(',')
						.map((s) => s.trim())
				)
				.filter(Boolean)
		: []

	const assets: PublicWebPieceAsset[] = [
		...result.transforms.map((r) => ({
			asset_key: r.asset_key,
			transformation: r.transformation,
			asset_path: r.asset_path ?? null,
			mime_type: r.mime_type,
			is_embedded: r.is_embedded,
			content: r.content
		})),
		...imagePassthroughs(fm, pieceConfig.fields.media, keyToPath),
		...attachmentPassthroughs(fm, pieceConfig.fields.attachments, keyToPath)
	]

	const piece: PublicWebPiece = {
		id: 'preview',
		key: result.pieceKey,
		slug: result.slug || slugify(result.filePath),
		type: result.type,
		title,
		summary,
		note: result.note,
		keywords: tagValues.length > 0 ? JSON.stringify(tagValues) : undefined,
		metadata: fm,
		assets,
		date_added: Date.now(),
		date_updated: Date.now(),
		date_consumed: dateConsumed
	}

	const tags = tagValues.map((t) => ({ slug: slugify(t), tag: t }))

	return { piece, tags }
}
