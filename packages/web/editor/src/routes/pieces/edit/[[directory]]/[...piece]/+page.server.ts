import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/pieces'
import { extractFrontmatterFromFormData } from '$lib/pieces/formData'

export const load: PageServerLoad = async ({ params }) => {
	const directory = params.directory || ''
	const file = `${directory}/${params.piece}`
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
		const directory = event.params.directory || ''
		const file = `${directory}/${event.params.piece}`
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

		redirect(303, `/directory/list/${directory}`)
	},
	edit: async (event) => {
		const directory = event.params.directory || ''
		const file = `${directory}/${event.params.piece}`
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type
		const formData = await event.request.formData()
		const note = formData.get('note') || ''

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

			markdown.frontmatter = frontmatter
			markdown.note = note as string
		} catch (e) {
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}

		await piece.write(markdown)
		redirect(303, `/pieces/list/${file}`)
	}
} satisfies Actions
