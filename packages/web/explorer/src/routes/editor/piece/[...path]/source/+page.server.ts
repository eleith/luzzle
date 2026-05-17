import { error, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { getStorage } from '$lib/server/storage'
import path from 'path'
import { config } from '$lib/server/config'
import {
	extractFullMarkdown,
	makePieceMarkdown,
	type PieceFrontmatter,
	type PieceMarkdown,
	type Piece,
	filterFrontmatterFields,
	resolveFieldPaths,
	getFrontmatterValue
} from '@luzzle/core'
import { normalizeLineEndings, normalizeMarkdown } from '$lib/server/markdown'

async function resolveAssetUrls(
	piece: Piece<PieceFrontmatter>,
	markdown: PieceMarkdown<PieceFrontmatter>,
	content: string,
	assetSchemaPaths: string[]
) {
	let updated = markdown

	for (const schemaPath of assetSchemaPaths) {
		const instancePaths = resolveFieldPaths(piece.fields, updated.frontmatter, schemaPath)

		for (const instancePath of instancePaths) {
			const value = getFrontmatterValue(updated.frontmatter, instancePath)
			if (typeof value !== 'string' || !/^https?:\/\//.test(value)) continue

			updated = await piece.setField(updated, instancePath, value)

			const resolved = getFrontmatterValue(updated.frontmatter, instancePath)
			if (typeof resolved === 'string' && /^https?:\/\//.test(resolved)) {
				return {
					error: fail(400, {
						error: {
							message: `Failed to download URL for '${instancePath}'. Remove the URL and use the form editor to upload the file instead.`
						},
						rawContent: content,
						fields: undefined,
						note: undefined
					})
				}
			}
		}
	}

	return { markdown: updated }
}

export const load: PageServerLoad = async ({ params }) => {
	const file = params.path
	const directory = path.dirname(file)
	const pieces = getPieces()
	const type = pieces.parseFilename(file).type

	if (!type) {
		return error(404, `piece type does not exist`)
	}

	const piece = await pieces.getPiece(type)
	const pieceMarkdown = await piece.get(file)

	if (!pieceMarkdown) {
		return error(404, `piece does not exist`)
	}

	const storage = getStorage()
	const rawContent = (await storage.readFile(file, 'text')) as string

	const assetPaths = filterFrontmatterFields(piece.fields, (f) => f.format === 'asset')

	return {
		file: pieceMarkdown.filePath,
		directory,
		type,
		rawContent,
		schema: piece.schema,
		canGenerate: config.ai !== undefined,
		assetFields: assetPaths
	}
}

export const actions = {
	default: async (event) => {
		const file = event.params.path
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type
		const formData = await event.request.formData()
		const content = formData.get('content')?.toString()

		if (!type) {
			return error(404, `piece type does not exist`)
		}

		if (!content) {
			return fail(400, { error: { message: 'content is required' } })
		}

		const piece = await pieces.getPiece(type)

		try {
			const normalized = normalizeLineEndings(content)
			const data = await extractFullMarkdown(normalized)
			const note = await normalizeMarkdown(data.markdown)
			const markdown = makePieceMarkdown(file, type, note, data.frontmatter as PieceFrontmatter)
			const assetPaths = filterFrontmatterFields(piece.fields, (f) => f.format === 'asset')

			if (assetPaths.length > 0) {
				const result = await resolveAssetUrls(piece, markdown, content, assetPaths)
				if ('error' in result) return result.error
				await piece.write(result.markdown)
			} else {
				await piece.write(markdown)
			}
		} catch (e: unknown) {
			const error = e instanceof Error ? e : new Error(String(e))
			console.error('Save raw action error:', error)
			return fail(400, {
				error: { message: `failed to save raw piece: ${error.message}` },
				rawContent: content,
				fields: undefined,
				note: undefined
			})
		}

		return { success: true }
	}
} satisfies Actions
