import { error } from '@sveltejs/kit'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import {
	filterFrontmatterFields,
	getFrontmatterValue,
	getFrontmatterValues,
	resolveFieldPaths,
	setFrontmatterValue,
	pieceFrontmatterValueToDatabaseValue,
	type PieceFrontMatterValue
} from '@luzzle/core'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { resolvePreviewAssets } from '$lib/pieces/preview/transforms/index.js'
import type { PublicWebPiece } from '$lib/pieces/types'
import type { PageServerLoad } from '../$types'

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
	const assetFieldPaths = filterFrontmatterFields(piece.fields, (f) => f.format === 'asset')
	const pathToKey = new Map<string, string>()
	const keyToPath = new Map<string, string>()
	const sanitizedMetadata = structuredClone(frontmatter)

	for (const field of piece.fields) {
		const val = sanitizedMetadata[field.name]
		if (val !== undefined) {
			sanitizedMetadata[field.name] = pieceFrontmatterValueToDatabaseValue(
				val,
				field
			) as PieceFrontMatterValue
		}
	}

	for (const schemaPath of assetFieldPaths) {
		for (const actualPath of resolveFieldPaths(piece.fields, frontmatter, schemaPath)) {
			const assetPath = getFrontmatterValue<string>(frontmatter, actualPath)
			if (assetPath) {
				const key = generateAssetKey(assetPath, config.assets.salt)
				pathToKey.set(assetPath, key)
				keyToPath.set(key, assetPath)
				setFrontmatterValue(sanitizedMetadata, actualPath, key)
			}
		}
	}

	const title = getFrontmatterValue<string>(frontmatter, pieceConfig.fields.title) || ''
	const summary = pieceConfig.fields.summary
		? getFrontmatterValue<string>(frontmatter, pieceConfig.fields.summary)
		: undefined
	const dateConsumed = getFrontmatterValue<number>(frontmatter, pieceConfig.fields.date_consumed)
	const tagValues = pieceConfig.fields.tags
		? getFrontmatterValues<string>(frontmatter, pieceConfig.fields.tags)
				.flat()
				.filter(Boolean)
				.flatMap((v) =>
					String(v)
						.split(',')
						.map((s) => s.trim())
				)
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
		slug: slugify(t),
		tag: t
	}))

	return {
		piece: previewPiece,
		tags,
		file
	}
}
