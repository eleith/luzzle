import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import { getFrontmatterValue, getFrontmatterValues } from '@luzzle/core'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { resolvePreviewAssets } from '$lib/pieces/preview/transforms/index.js'
import type { PublicWebPiece } from '$lib/pieces/types'

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

function sanitizeMetadata(jsonMetadata: string, pathToKey: Map<string, string>): string {
	if (pathToKey.size === 0) return jsonMetadata
	return JSON.stringify(
		JSON.parse(jsonMetadata, (_key, value) => {
			if (typeof value === 'string' && pathToKey.has(value)) {
				return pathToKey.get(value)
			}
			return value
		})
	)
}

function collectAssetPaths(
	frontmatter: Record<string, unknown>,
	pieceConfig: (typeof config.pieces)[number]
): string[] {
	const paths: string[] = []
	const fields = [...(pieceConfig.fields.media || []), ...(pieceConfig.fields.attachments || [])]

	for (const field of fields) {
		const values = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
		paths.push(...values)
	}

	return paths
}

export const load: PageServerLoad = async ({ params }) => {
	const file = params.path
	const pieces = getPieces()
	const { type, slug } = pieces.parseFilename(file)

	if (!type) {
		return error(404, 'piece type does not exist')
	}

	const pieceConfig = config.pieces.find((p) => p.type === type)
	if (!pieceConfig) {
		return error(404, 'piece type not configured')
	}

	const piece = await pieces.getPiece(type)
	const markdown = await piece.get(file)

	if (!markdown) {
		return error(404, 'piece does not exist')
	}

	const frontmatter = markdown.frontmatter
	const assetPaths = collectAssetPaths(frontmatter, pieceConfig)
	const pathToKey = new Map<string, string>()
	const keyToPath = new Map<string, string>()

	for (const assetPath of assetPaths) {
		const key = generateAssetKey(assetPath, config.assets.salt)
		pathToKey.set(assetPath, key)
		keyToPath.set(key, assetPath)
	}

	const sanitizedMetadata = JSON.parse(sanitizeMetadata(JSON.stringify(frontmatter), pathToKey))

	const title = getFrontmatterValue<string>(frontmatter, pieceConfig.fields.title) || ''
	const summary = pieceConfig.fields.summary
		? getFrontmatterValue<string>(frontmatter, pieceConfig.fields.summary)
		: undefined
	const dateConsumed = getFrontmatterValue<number>(frontmatter, pieceConfig.fields.date_consumed)
	const tagValues = pieceConfig.fields.tags
		? getFrontmatterValues<string>(frontmatter, pieceConfig.fields.tags)
				.flat()
				.filter(Boolean)
				.flatMap((v) => v.split(',').map((s) => s.trim()))
				.filter(Boolean)
		: []

	const pieceKey = generateAssetKey(file, config.assets.salt)

	const assets = await resolvePreviewAssets({
		frontmatter,
		note: markdown.note,
		filePath: file,
		type,
		slug: slug || slugify(file),
		key: pieceKey,
		pieceConfig,
		config,
		pieces,
		keyToPath,
		pathToKey
	})

	const previewPiece: PublicWebPiece = {
		id: 'preview',
		key: pieceKey,
		slug: slug || slugify(file),
		type,
		title,
		summary,
		note: markdown.note,
		keywords: tagValues.length > 0 ? JSON.stringify(tagValues) : undefined,
		metadata: sanitizedMetadata,
		assets,
		date_added: Date.now(),
		date_updated: Date.now(),
		date_consumed: dateConsumed
	}

	const tags = tagValues.map((t) => ({
		slug: slugify(t.trim()),
		tag: t.trim()
	}))

	return {
		piece: previewPiece,
		tags,
		file
	}
}
