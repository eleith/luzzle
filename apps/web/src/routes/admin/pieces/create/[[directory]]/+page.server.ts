import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces, promptToPiece } from '$lib/server/pieces'
import { config } from '$lib/server/config'
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

	const pieces = getPieces()
	const currentDir = directory || '.'
	const files = await pieces.getFilesIn(currentDir)
	const subDirectories = files.directories
		.filter((d) => !pieces.isAsset(d))
		.map((d) => {
			const name = d.replace(/\/$/, '')
			return currentDir === '.' ? name : `${currentDir}/${name}`
		})
	const allDirectories = [currentDir, ...subDirectories]

	return {
		types,
		type,
		directory,
		directories: allDirectories,
		canGenerate
	}
}

export const actions = {
	create: async (event) => {
		const pieces = getPieces()
		const formData = await event.request.formData()
		const name = formData.get('name')?.toString()
		const type = formData.get('type')?.toString()
		const directory = formData.get('directory')?.toString() || ''
		const shouldGenerate = formData.get('generate') === 'true'
		const promptInput = formData.get('prompt')?.toString() || ''
		const submitted = {
			name: name || '',
			type: type || '',
			directory,
			prompt: promptInput,
			generate: shouldGenerate
		}
		const types = await pieces.getTypes()
		const titleField = config.pieces.find((p) => p.type === type)?.fields.title

		if (!type || !types.includes(type)) {
			return fail(400, { ...submitted, error: { message: 'piece type does not exist' } })
		}

		if (!name || !titleField) {
			return fail(400, {
				...submitted,
				error: { message: 'name is required and piece needs a title field' }
			})
		}

		const piece = await pieces.getPiece(type)
		let markdown

		try {
			markdown = await piece.create(directory, name)
			markdown = await piece.setField(markdown, titleField, name)
		} catch (e) {
			console.error('Piece creation error:', e)
			return fail(400, { ...submitted, error: { message: `failed to create piece: ${e}` } })
		}

		if (!shouldGenerate || !config.ai) {
			try {
				await piece.write(markdown)
			} catch (e) {
				console.error('Piece creation error:', e)
				return fail(400, { ...submitted, error: { message: `failed to create piece: ${e}` } })
			}
			redirect(303, `/admin/piece/${markdown.filePath}/source`)
		}

		const files = formData.getAll('files') as File[]

		const instruction =
			'Generate all required fields, and attempt to generate as many of the other fields as possible where there is high confidence in the accuracy of the values.'
		const finalPrompt = promptInput.trim() ? `${promptInput}\n\nNote: ${instruction}` : instruction

		const contextPrompt = `You are a digital archivist tasked with correcting incorrect metadata and updating any missing data.

Current Metadata (from disk):
${JSON.stringify(markdown.frontmatter, null, 2)}

Target Fields to Update: All Fields

User Request:
${finalPrompt}

IMPORTANT: Please only provide values for the targeted fields. For any fields that are not being updated, please return their current values from the provided metadata.`

		try {
			const buffers: Buffer[] = []
			for (const file of files.filter((f) => f.size > 0)) {
				buffers.push(Buffer.from(await file.arrayBuffer()))
			}

			const generatedFields = await promptToPiece(
				piece.schema as PieceFrontmatterSchema<PieceFrontmatter>,
				contextPrompt,
				buffers
			)

			const mergedFields = { ...markdown.frontmatter, ...generatedFields }
			const mergedMarkdown = makePieceMarkdown(markdown.filePath, type, '', mergedFields)
			const mergedContent = makePieceMarkdownString(mergedMarkdown)

			try {
				await piece.write(markdown)
			} catch (e) {
				console.error('Piece creation error:', e)
				return fail(400, { ...submitted, error: { message: `failed to create piece: ${e}` } })
			}

			return {
				...submitted,
				fields: mergedFields,
				mergedContent,
				filePath: markdown.filePath
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			console.error('Generation error:', message)
			return fail(500, { ...submitted, error: { message: `Generation failed: ${message}` } })
		}
	}
} satisfies Actions
