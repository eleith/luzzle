import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { applyFieldUpdate } from '$lib/server/formData'
import { findFrontmatterField, getFrontmatterValue, getPieceFrontmatterPaths } from '@luzzle/core'
import path from 'path'

export const load: PageServerLoad = async ({ params, url }) => {
	const file = params.path
	const directory = path.dirname(file)
	const pieces = getPieces()
	const type = pieces.parseFilename(file).type
	const targetPath = url.searchParams.get('path')

	if (!type) {
		return error(404, `piece type does not exist`)
	}

	const piece = await pieces.getPiece(type)
	const pieceMarkdown = await piece.get(file)

	if (!pieceMarkdown) {
		return error(404, `piece does not exist`)
	}

	const validPaths = getPieceFrontmatterPaths(piece.schema, pieceMarkdown.frontmatter)

	let targetSchema
	let targetValue

	if (targetPath) {
		targetSchema = findFrontmatterField(piece.fields, targetPath)
		targetValue = getFrontmatterValue(pieceMarkdown.frontmatter, targetPath)
	}

	return {
		type: pieceMarkdown.piece,
		file: pieceMarkdown.filePath,
		directory,
		paths: validPaths,
		targetPath,
		targetSchema: targetSchema && targetPath ? { ...targetSchema, name: targetPath } : undefined,
		targetValue
	}
}

export const actions = {
	default: async (event) => {
		const file = event.params.path
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type
		const formData = await event.request.formData()
		const targetPath = event.url.searchParams.get('path')

		if (!type) {
			return error(404, `piece type does not exist`)
		}

		if (!targetPath) {
			return fail(400, { error: { message: 'no field path specified' } })
		}

		const piece = await pieces.getPiece(type)
		let markdown = await piece.get(file)

		if (!markdown) {
			return error(404, `piece does not exist`)
		}

		try {
			markdown = await applyFieldUpdate(piece, markdown, formData, targetPath)
			await piece.write(markdown)
		} catch (e) {
			console.error('Field edit error:', e)
			return fail(400, { error: { message: `failed to edit field: ${e}` } })
		}

		redirect(303, `/editor/piece/${file}`)
	}
} satisfies Actions
