import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { extractFrontmatterFromFormData, extractNoteFromFormData } from '$lib/server/formData'
import { initializePieceFrontMatter } from '@luzzle/core'

export const load: PageServerLoad = async ({ params, url }) => {
	const typeParam = url.searchParams.get('type')
	const directory = params.directory || ''
	const pieces = getPieces()
	const types = await pieces.getTypes()
	const type = typeParam && types.includes(typeParam) ? typeParam : types[0]

	const piece = await pieces.getPiece(type)
	const defaults = initializePieceFrontMatter(piece.schema, true)

	return {
		types,
		type,
		directory,
		mode: 'create',
		schema: piece.fields,
		defaults
	}
}

export const actions = {
	create: async (event) => {
		const pieces = getPieces()
		const formData = await event.request.formData()
		const name = formData.get('name')?.toString()
		const type = formData.get('type')?.toString()
		const directory = event.params.directory || ''
		const types = await pieces.getTypes()

		if (!type || !types.includes(type)) {
			return error(404, `piece type does not exist`)
		}

		const piece = await pieces.getPiece(type)
		const markdown = await piece.create(directory, name as string)

		try {
			const frontmatter = await extractFrontmatterFromFormData(piece, markdown, formData)
			const note = await extractNoteFromFormData(formData)

			markdown.frontmatter = frontmatter
			markdown.note = note

			await piece.write(markdown)
		} catch (e) {
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}

		redirect(303, `/editor/pieces/view/${markdown.filePath}`)
	}
} satisfies Actions
