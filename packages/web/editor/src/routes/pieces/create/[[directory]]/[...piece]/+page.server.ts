import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces, promptToPiece } from '$lib/pieces'
import { extractFrontmatterFromFormData, extractNoteFromFormData } from '$lib/pieces/formData'

export const load: PageServerLoad = async ({ params }) => {
	const directory = params.directory || ''
	const pieces = getPieces()
	const types = await pieces.getTypes()

	return {
		types,
		directory,
		mode: 'create'
	}
}

export const actions = {
	prompt: async (event) => {
		const formData = await event.request.formData()
		const types = await getPieces().getTypes()
		const directory = event.params.directory || ''
		const type = formData.get('type')?.toString()
		const prompt = formData.get('prompt')?.toString()
		const file = formData.get('file') as File
		const name = formData.get('name')?.toString()

		let buffer: Buffer | undefined = undefined

		if (!type || !types.includes(type)) {
			return fail(404, { error: { message: 'type does not exist' } })
		}

		if (!name) {
			return fail(404, { error: { message: 'piece needs a name' } })
		}

		const pieces = getPieces()
		const piece = await pieces.getPiece(type)

		if (file && file.size > 0) {
			const fileArrayBuffer = await file.arrayBuffer()
			buffer = Buffer.from(fileArrayBuffer)
		}

		try {
			let markdown = await piece.create(directory, name)

			if (prompt) {
				const metadata = await promptToPiece(piece.schema, prompt as string, buffer)
				markdown = await piece.setFields(markdown, metadata)
			}

			return {
				type,
				directory,
				name,
				fields: piece.fields,
				markdown
			}
		} catch (e) {
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}
	},
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
		} catch (e) {
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}

		await piece.write(markdown)

		redirect(303, `/pieces/list/${markdown.filePath}`)
	}
} satisfies Actions
