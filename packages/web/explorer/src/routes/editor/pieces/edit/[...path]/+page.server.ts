import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { extractFrontmatterFromFormData, extractNoteFromFormData } from '$lib/server/formData'
import path from 'path'

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

	return {
		type: pieceMarkdown.piece,
		slug: pieces.parseFilename(file).slug,
		note: pieceMarkdown.note,
		fields: pieceMarkdown.frontmatter,
		schema: piece.fields,
		file: pieceMarkdown.filePath,
		mode: 'edit',
		directory
	}
}

export const actions = {
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

		redirect(303, `/editor/directory/${directory === '.' ? '' : directory}`)
	},
	edit: async (event) => {
		const file = event.params.path
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type
		const formData = await event.request.formData()

		if (!type) {
			return error(404, `piece type does not exist`)
		}

		const piece = await pieces.getPiece(type)
		const markdown = await piece.get(file)

		if (!markdown) {
			return error(404, `piece does not exist`)
		}

		try {
			const frontmatter = await extractFrontmatterFromFormData(piece, markdown, formData)
			const note = await extractNoteFromFormData(formData)

			markdown.frontmatter = frontmatter
			markdown.note = note
		} catch (e) {
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}

		await piece.write(markdown)
		redirect(303, `/editor/pieces/view/${file}`)
	}
} satisfies Actions
