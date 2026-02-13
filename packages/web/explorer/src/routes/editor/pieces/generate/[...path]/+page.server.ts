import { error, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces, promptToPiece } from '$lib/server/pieces'
import {
	type PieceFrontmatter,
	type PieceFrontmatterSchema,
	findFrontmatterField
} from '@luzzle/core'
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
		fields: pieceMarkdown.frontmatter,
		schema: piece.fields,
		file: pieceMarkdown.filePath,
		directory
	}
}

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData()
		const file = event.params.path
		const prompt = formData.get('prompt')?.toString() || ''
		const targetField = formData.get('field')?.toString()
		const files = formData.getAll('files') as File[]
		const buffers: Buffer[] = []

		const pieces = getPieces()
		const type = pieces.parseFilename(file).type

		if (!type) {
			return fail(404, {
				fields: {},
				note: '',
				error: { message: 'piece type does not exist' }
			})
		}

		const piece = await pieces.getPiece(type)
		const currentMarkdown = await piece.get(file)
		const currentFields = currentMarkdown?.frontmatter || {}

		for (const file of files.filter((f) => f.size > 0)) {
			const fileArrayBuffer = await file.arrayBuffer()
			buffers.push(Buffer.from(fileArrayBuffer))
		}

		if (targetField && targetField !== 'all') {
			const field = findFrontmatterField(piece.fields, targetField)
			if (!field) {
				return fail(400, {
					fields: currentFields,
					note: currentMarkdown?.note || '',
					error: { message: `field ${targetField} does not exist in schema` }
				})
			}
		}

		try {
			// Append current field values to prompt for context
			const contextPrompt = `You are a digital archivist tasked with correcting incorrect metadata and updating any missing data.

Current Metadata (from disk):
${JSON.stringify(currentFields, null, 2)}

Target Fields to Update: ${targetField === 'all' ? 'All Fields' : targetField}

User Request:
${prompt}

IMPORTANT: Please only provide values for the targeted fields. For any fields that are not being updated, please return their current values from the provided metadata.`

			const generatedFields = await promptToPiece(
				piece.schema as PieceFrontmatterSchema<PieceFrontmatter>,
				contextPrompt,
				buffers
			)

			// Merge: start with current fields, overwrite with generated
			const mergedFields = { ...currentFields, ...generatedFields }

			return {
				fields: mergedFields,
				note: currentMarkdown?.note || '',
				error: undefined
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			return fail(500, {
				fields: currentFields, // Return current fields on error so we don't wipe form
				note: currentMarkdown?.note || '',
				error: { message: `Generation failed: ${message}` }
			})
		}
	}
} satisfies Actions
