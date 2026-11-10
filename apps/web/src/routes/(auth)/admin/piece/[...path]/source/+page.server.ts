import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '#lib/server/pieces.js'
import { getStorage } from '#lib/server/storage.js'
import { db } from '#lib/server/database/index.js'
import { getPiecePublicationState } from '#lib/pieces/publication.server.js'
import path from 'path'
import { config } from '#lib/server/config.js'
import {
	asCoreDatabase,
	extractFullMarkdown,
	makePieceMarkdown,
	type PieceFrontmatter,
	type PieceMarkdown,
	filterFrontmatterFields,
	savePieceAsset
} from '@luzzle/core'
import { Readable } from 'stream'
import { normalizeMarkdown } from '#lib/server/markdown.js'

export const load: PageServerLoad = async ({ params }) => {
	const file = params.path
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
	const [rawContent, publicationState] = await Promise.all([
		storage.readFile(file, 'text') as Promise<string>,
		getPiecePublicationState(file)
	])

	const assetPaths = filterFrontmatterFields(piece.fields, (f) => f.format === 'asset')

	return {
		file: pieceMarkdown.filePath,
		type,
		rawContent,
		schema: piece.schema,
		canGenerate: config.ai !== undefined,
		assetFields: assetPaths,
		...publicationState
	}
}

export const actions = {
	format: async (event) => {
		const formData = await event.request.formData()
		const content = formData.get('content')

		if (typeof content !== 'string') {
			return fail(400, { error: { message: 'content is required' } })
		}

		try {
			return { formattedContent: await normalizeMarkdown(content) }
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			return fail(400, { error: { message } })
		}
	},
	save: async (event) => {
		const file = event.params.path
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type
		const formData = await event.request.formData()
		const content = formData.get('content')

		if (!type) {
			return error(404, `piece type does not exist`)
		}

		if (typeof content !== 'string' || !content) {
			return fail(400, { error: { message: 'content is required' } })
		}

		const piece = await pieces.getPiece(type)

		let markdown: PieceMarkdown<PieceFrontmatter>
		try {
			const data = await extractFullMarkdown(content)
			markdown = makePieceMarkdown(file, type, data.markdown, data.frontmatter as PieceFrontmatter)
			const validated = piece.validate(markdown)
			if (!validated.isValid) {
				throw new Error(validated.errors.join('\n'))
			}
			await getStorage().writeFile(file, content)
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

		try {
			await piece.syncMarkdown(asCoreDatabase(db), markdown)
		} catch (e) {
			console.error('Sync after Save failed:', e)
			return fail(500, {
				error: {
					message: 'Markdown was saved, but its database index could not be updated.'
				},
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
		const mode = formData.get('mode') as 'file' | 'url' | 'create' | null

		if (mode === 'create') {
			if (!name || !name.trim()) {
				return fail(400, { error: { message: 'Filename is required to create a blank file.' } })
			}
		} else if ((!uploadedFile || uploadedFile.size === 0) && !url) {
			return fail(400, { error: { message: 'No file or URL provided' } })
		}

		try {
			const storage = getStorage()
			let relativePath: string

			if (mode === 'create') {
				const emptyStream = Readable.from(Buffer.alloc(0))
				relativePath = await savePieceAsset(file, name!.trim(), emptyStream, storage)
			} else if (url) {
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

		redirect(303, '/admin')
	}
} satisfies Actions
