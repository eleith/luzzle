import {
	compile,
	filterFrontmatterFields,
	getFrontmatterValue,
	resolveFieldPaths,
	savePieceAsset,
	type LuzzleStorage,
	type Piece,
	type PieceFrontmatter,
	type PieceMarkdown
} from '@luzzle/core'
import { stringify } from 'yaml'

type AssetUrl = { fieldPath: string; url: string }

function findAssetUrls(piece: Piece<PieceFrontmatter>, frontmatter: PieceFrontmatter): AssetUrl[] {
	const assetFields = filterFrontmatterFields(piece.fields, (field) => field.format === 'asset')
	const assetUrls: AssetUrl[] = []
	for (const schemaPath of assetFields) {
		for (const fieldPath of resolveFieldPaths(piece.fields, frontmatter, schemaPath)) {
			const value = getFrontmatterValue(frontmatter, fieldPath)
			if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
				assetUrls.push({ fieldPath, url: value })
			}
		}
	}
	return assetUrls
}

async function downloadAssetUrls(
	piece: Piece<PieceFrontmatter>,
	markdown: PieceMarkdown<PieceFrontmatter>,
	assetUrls: AssetUrl[],
	storage: LuzzleStorage
) {
	for (const { fieldPath, url } of assetUrls) {
		const name = fieldPath.split('.').findLast((part) => !/^\d+$/.test(part)) ?? 'attachment'
		try {
			const assetPath = await savePieceAsset(markdown.filePath, url, storage, { name })
			markdown = await piece.setField(markdown, fieldPath, assetPath)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			throw new Error(`Failed to download asset for '${fieldPath}': ${message}`)
		}
	}
	return markdown
}

export async function downloadAssetsAndRewriteSource(
	piece: Piece<PieceFrontmatter>,
	markdown: PieceMarkdown<PieceFrontmatter>,
	source: string,
	storage: LuzzleStorage
) {
	const assetUrls = findAssetUrls(piece, markdown.frontmatter)
	if (!assetUrls.length) return { source, markdown }

	// Invalid drafts must fail before downloading. Final storage validation remains strict.
	const validateDraft = compile(piece.schema, { allowAssetUrls: true })
	if (!validateDraft(markdown.frontmatter)) {
		throw new Error(
			validateDraft.errors?.map((error) => `${error.instancePath} ${error.message}`).join('\n')
		)
	}
	const frontmatterMatch =
		/^(\uFEFF?---[ \t]*(?:\r\n|[\r\n]))[\s\S]*?(?:\r\n|[\r\n])---[ \t]*(?=[\r\n]|$)/.exec(source)
	if (!frontmatterMatch) throw new Error('Could not find the frontmatter containing asset URLs.')

	const downloaded = await downloadAssetUrls(piece, markdown, assetUrls, storage)
	const openingDelimiter = frontmatterMatch[1]
	const unchangedSuffix = source.slice(frontmatterMatch[0].length)
	const lineEnding = openingDelimiter.endsWith('\r\n') ? '\r\n' : openingDelimiter.slice(-1)
	const yaml = stringify(downloaded.frontmatter).replace(/\n/g, lineEnding)
	// Only URL-converting saves serialize frontmatter. Everything after its delimiter stays untouched.
	const savedSource = `${openingDelimiter}${yaml}---${unchangedSuffix}`
	return { source: savedSource, markdown: downloaded }
}
