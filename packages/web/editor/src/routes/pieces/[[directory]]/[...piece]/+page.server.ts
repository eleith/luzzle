import { error } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/storage'
import { Readable } from 'stream'
import { ReadableStream } from 'stream/web'

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
		directory
	}
}

export const actions = {
	default: async (event) => {
		const directory = event.params.directory || ''
		const file = `${directory}/${event.params.piece}`
		const pieces = getPieces()
		const type = pieces.parseFilename(file).type
		const data = await event.request.formData()

		if (!type) {
			return error(404, `piece type does not exist`)
		}

		const piece = await pieces.getPiece(type)
		let markdown = await piece.get(file)

		if (!markdown) {
			return error(404, `piece does not exist`)
		}

		const note = data.get('note')

		if (note !== markdown.note) {
			markdown.note = (note as string) || ''
		}

		for (const field of piece.fields) {
			const key = field.name
			if (data.has(`frontmatter.${key}`)) {
				const value = data.get(`frontmatter.${key}`)

				if (field.format === 'asset') {
					if (data.has(`upload.${key}`)) {
						const file = data.get(`upload.${key}`) as File
						if (file) {
							const stream = Readable.fromWeb(file.stream() as ReadableStream<Uint8Array>)
							markdown = await piece.setField(markdown, key, stream)
						}
					}
				} else if (value !== markdown.frontmatter[key]) {
					if (value !== '') {
						markdown = await piece.setField(markdown, key, value)
					} else {
						markdown = await piece.removeField(markdown, key)
					}
				}
			}
		}

		await piece.write(markdown)
	}
} satisfies Actions
