import {
	type Pieces,
	type PieceFrontmatter,
	type PieceFrontMatterValue,
	filterFrontmatterFields,
	getFrontmatterValue,
	pieceFrontmatterValueToDatabaseValue,
	resolveFieldPaths,
	setFrontmatterValue,
} from '@luzzle/core'
import { generateAssetKey } from '../assets/key.js'
import { completed, type Step, type StepResult } from '../core/step.js'
import type { WebPieces } from '../services/db.js'

export type ParsedPreview = {
	type: string
	slug: string
	webPiece: WebPieces
	pathToKey: Map<string, string>
	keyToPath: Map<string, string>
	sanitizedFrontmatter: PieceFrontmatter
	note: string
}

export interface PreviewParseInput {
	filePath: string
	pieces: Pieces
}

export const previewParseStep: Step<PreviewParseInput, ParsedPreview> = {
	name: 'parse',
	async run({ filePath, pieces }, ctx): Promise<StepResult<ParsedPreview>> {
		const { config } = ctx
		const parts = pieces.parseFilename(filePath)
		if (!parts.type) {
			throw new Error(`unknown piece type for ${filePath}`)
		}

		const piece = await pieces.getPiece(parts.type)
		const markdown = await piece.get(filePath)
		const frontmatter = markdown.frontmatter

		const sanitizedFrontmatter = structuredClone(frontmatter)
		for (const field of piece.fields) {
			const value = sanitizedFrontmatter[field.name]
			if (value !== undefined) {
				sanitizedFrontmatter[field.name] = pieceFrontmatterValueToDatabaseValue(
					value,
					field
				) as PieceFrontMatterValue
			}
		}

		const pathToKey = new Map<string, string>()
		const keyToPath = new Map<string, string>()
		const assetFieldPaths = filterFrontmatterFields(piece.fields, (f) => f.format === 'asset')
		for (const schemaPath of assetFieldPaths) {
			for (const actualPath of resolveFieldPaths(piece.fields, frontmatter, schemaPath)) {
				const assetPath = getFrontmatterValue<string>(frontmatter, actualPath)
				if (assetPath) {
					const key = generateAssetKey(assetPath, config.assets.salt)
					pathToKey.set(assetPath, key)
					keyToPath.set(key, assetPath)
					setFrontmatterValue(sanitizedFrontmatter, actualPath, key)
				}
			}
		}

		const slug = parts.slug || filePath
		const pieceKey = generateAssetKey(filePath, config.assets.salt)

		const webPiece: WebPieces = {
			id: 'preview',
			file_path: filePath,
			type: parts.type,
			slug,
			key: pieceKey,
			title: '',
			json_metadata: JSON.stringify(sanitizedFrontmatter),
			date_added: Date.now(),
			date_updated: Date.now(),
		}

		return completed({
			type: parts.type,
			slug,
			webPiece,
			pathToKey,
			keyToPath,
			sanitizedFrontmatter,
			note: markdown.note ?? '',
		})
	},
}
