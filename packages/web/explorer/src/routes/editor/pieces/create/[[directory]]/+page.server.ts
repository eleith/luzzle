import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { extractNoteFromFormData } from '$lib/server/formData'
import { config } from '$lib/server/config'

export const load: PageServerLoad = async ({ params, url }) => {
	const typeParam = url.searchParams.get('type')
	const directory = params.directory || ''
	const types = config.pieces.map((x) => x.type)
	const type = typeParam && types.includes(typeParam) ? typeParam : types[0]

	return {
		types,
		type,
		directory
	}
}

export const actions = {
	create: async (event) => {
		const pieces = getPieces()
		const formData = await event.request.formData()
		const name = formData.get('name')?.toString()
		const type = formData.get('type')?.toString()
		const directory = event.params.directory || ''
		const note = await extractNoteFromFormData(formData)
		const types = await pieces.getTypes()

		if (!type || !types.includes(type)) {
			return error(404, `piece type does not exist`)
		}

		if (!name) {
			return fail(400, { error: { message: 'filename is required' } })
		}

		const piece = await pieces.getPiece(type)
		let markdown

		try {
			markdown = await piece.create(directory, name)

			markdown.note = note
			// Note: piece.create already initializes required frontmatter via initializePieceFrontMatter.
			// We just save the piece with the note.
			await piece.write(markdown)
		} catch (e) {
			console.error('Piece creation error:', e)
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}

		redirect(303, `/editor/piece/${markdown.filePath}`)
	}
} satisfies Actions
