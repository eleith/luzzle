import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { applyFormDataToPiece, extractNoteFromFormData } from '$lib/server/formData'
import path from 'path'
import { config } from '$lib/server/config'
import type { PieceFrontmatterSchemaField } from '@luzzle/core'

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

	// Detect complexity: arrays of objects that themselves contain arrays
	const isTooComplex = piece.fields.some((f) => hasNestedArrays(f))

	function hasNestedArrays(field: PieceFrontmatterSchemaField): boolean {
		if (field.type === 'array' && field.items.type === 'object') {
			return Object.values(field.items.properties).some(
				(p) => (p as PieceFrontmatterSchemaField).type === 'array'
			)
		}
		return false
	}

	return {
		type: pieceMarkdown.piece,
		slug: pieces.parseFilename(file).slug,
		note: pieceMarkdown.note,
		fields: pieceMarkdown.frontmatter,
		schema: piece.fields,
		canGenerate: config.ai !== undefined,
		file: pieceMarkdown.filePath,
		mode: 'edit',
		directory,
		isTooComplex
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

		redirect(303, `/admin/directory/${directory === '.' ? '' : directory}`)
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
		let markdown = await piece.get(file)

		if (!markdown) {
			return error(404, `piece does not exist`)
		}

		try {
			markdown = await applyFormDataToPiece(piece, markdown, formData)
			const note = await extractNoteFromFormData(formData)

			markdown.note = note

			await piece.write(markdown)
		} catch (e: unknown) {
			const error = e instanceof Error ? e : new Error(String(e))
			console.error('Edit action error:', error)
			return fail(400, {
				error: { message: `failed to edit piece: ${error.message}` },
				fields: markdown.frontmatter,
				note: markdown.note,
				rawContent: undefined
			})
		}

		const returnTo = event.url.searchParams.get('returnTo')
		redirect(303, returnTo || `/admin/piece/${file}`)
	}
} satisfies Actions
