import { error, fail, redirect } from '@sveltejs/kit'
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
	getFrontmatterValue,
	savePieceAsset
} from '@luzzle/core'
import { Readable } from 'stream'
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
	save: async (event) => {
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
	},
	attach: async (event) => {
		const file = event.params.path
		const formData = await event.request.formData()
		const uploadedFile = formData.get('file') as File | null
		const url = formData.get('url') as string | null
		const name = formData.get('name') as string | null

		if ((!uploadedFile || uploadedFile.size === 0) && !url) {
			return fail(400, { error: { message: 'No file or URL provided' } })
		}

		try {
			const storage = getStorage()
			let relativePath: string

			if (url) {
				relativePath = await savePieceAsset(file, url, storage, name ? { name } : undefined)
			} else if (uploadedFile) {
				const arrayBuffer = await uploadedFile.arrayBuffer()
				const stream = Readable.from(Buffer.from(arrayBuffer))

				let targetFilename = uploadedFile.name
				if (name) {
					const ext = path.extname(uploadedFile.name)
					const hasExt = path.extname(name) !== ''
					targetFilename = hasExt ? name : name + ext
				}

				relativePath = await savePieceAsset(file, targetFilename, stream, storage)
			} else {
				throw new Error('Invalid attach request')
			}

			return { success: true, path: relativePath }
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			return fail(500, { error: { message: `Failed to save attachment: ${message}` } })
		}
	},
	delete: async (event) => {
		const file = event.params.path
		const directory = path.dirname(file)
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type

		if (!type) {
			return error(404, `piece type does not exist`)
		}

		try {
			const piece = await pieces.getPiece(type)
			await piece.delete(file)
		} catch (e) {
			return error(500, `piece could not be deleted: ${e}`)
		}

		redirect(303, `/admin/directory/${directory === '.' ? '' : directory}`)
	}
} satisfies Actions
