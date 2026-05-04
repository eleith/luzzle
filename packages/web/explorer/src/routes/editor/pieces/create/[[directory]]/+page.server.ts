import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces, promptToPiece } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import { extractEditorTheme } from '$lib/server/shiki'
import {
	type PieceFrontmatter,
	type PieceFrontmatterSchema,
	makePieceMarkdown,
	makePieceMarkdownString
} from '@luzzle/core'

export const load: PageServerLoad = async ({ params, url }) => {
	const typeParam = url.searchParams.get('type')
	const directory = params.directory || ''
	const types = config.pieces.map((x) => x.type)
	const type = typeParam && types.includes(typeParam) ? typeParam : types[0]

	const canGenerate = config.ai !== undefined

	const editorThemes = {
		light: await extractEditorTheme(config.theme.markdown.code.light, 'light'),
		dark: await extractEditorTheme(config.theme.markdown.code.dark, 'dark')
	}

	return {
		types,
		type,
		directory,
		canGenerate,
		editorThemes
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
		const titleField = config.pieces.find((p) => p.type === type)?.fields.title

		if (!type || !types.includes(type)) {
			return error(404, `piece type does not exist`)
		}

		if (!name || !titleField) {
			return fail(400, { error: { message: 'name is required and piece needs a title field' } })
		}

		const piece = await pieces.getPiece(type)
		let markdown

		try {
			markdown = await piece.create(directory, name)
			markdown = await piece.setField(markdown, titleField, name)

			await piece.write(markdown)
		} catch (e) {
			console.error('Piece creation error:', e)
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}

		const shouldGenerate = formData.get('generate') === 'true'
		const prompt = formData.get('prompt')?.toString() || ''
		const files = formData.getAll('files') as File[]

		if (!shouldGenerate || !config.ai) {
			redirect(303, `/editor/piece/${markdown.filePath}/source`)
		}

		const buffers: Buffer[] = []
		for (const file of files.filter((f) => f.size > 0)) {
			const arrayBuffer = await file.arrayBuffer()
			buffers.push(Buffer.from(arrayBuffer))
		}

		const defaultPrompt = `generate all fields for this ${type} piece.`

		const contextPrompt = `You are a digital archivist tasked with correcting incorrect metadata and updating any missing data.

Current Metadata (from disk):
${JSON.stringify(markdown.frontmatter, null, 2)}

Target Fields to Update: All Fields

User Request:
${prompt || defaultPrompt}

IMPORTANT: Please only provide values for the targeted fields. For any fields that are not being updated, please return their current values from the provided metadata.`

		try {
			const generatedFields = await promptToPiece(
				piece.schema as PieceFrontmatterSchema<PieceFrontmatter>,
				contextPrompt,
				buffers
			)

			const mergedFields = { ...markdown.frontmatter, ...generatedFields }
			const mergedMarkdown = makePieceMarkdown(markdown.filePath, type, '', mergedFields)
			const mergedContent = makePieceMarkdownString(mergedMarkdown)

			return {
				fields: mergedFields,
				mergedContent,
				filePath: markdown.filePath,
				directory,
				type
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			console.error('Generation error:', message)

			redirect(303, `/editor/piece/${markdown.filePath}/source`)
		}
	}
} satisfies Actions
