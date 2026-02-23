import { error, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { getStorage } from '$lib/server/storage'
import path from 'path'
import { config } from '$lib/server/config'
import { extractFullMarkdown, makePieceMarkdown, type PieceFrontmatter } from '@luzzle/core'
import { extractEditorTheme } from '$lib/server/shiki'

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

	const storage = getStorage()
	const rawContent = (await storage.readFile(file, 'text')) as string

	const editorThemes = {
		light: await extractEditorTheme(config.theme.markdown.code.light, 'light'),
		dark: await extractEditorTheme(config.theme.markdown.code.dark, 'dark')
	}

	return {
		file: pieceMarkdown.filePath,
		directory,
		type,
		rawContent,
		editorThemes,
		schema: piece.schema,
		canGenerate: config.ai !== undefined
	}
}

export const actions = {
	default: async (event) => {
		const file = event.params.path
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type
		const formData = await event.request.formData()
		const content = formData.get('content')?.toString()

		if (!type) {
			return error(404, `piece type does not exist`)
		}

		if (!content) {
			return fail(400, { error: { message: 'content is required' } })
		}

		const piece = await pieces.getPiece(type)

		try {
			const data = await extractFullMarkdown(content)
			const markdown = makePieceMarkdown(
				file,
				type,
				data.markdown,
				data.frontmatter as PieceFrontmatter
			)
			await piece.write(markdown)
		} catch (e: unknown) {
			const error = e instanceof Error ? e : new Error(String(e))
			console.error('Save raw action error:', error)
			return fail(400, {
				error: { message: `failed to save raw piece: ${error.message}` },
				rawContent: content,
				fields: undefined,
				note: undefined
			})
		}

		return { success: true }
	}
} satisfies Actions
