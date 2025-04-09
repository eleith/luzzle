import { error, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces } from '$lib/pieces'
import { Readable } from 'stream'
import { ReadableStream } from 'stream/web'
import type { BufferLike } from 'webdav'

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
	delete: async (event) => {
		const directory = event.params.directory || ''
		const file = `${directory}/${event.params.piece}`
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

		redirect(303, `/directory/list/${directory}`)
	},
	edit: async (event) => {
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
			const isArray = field.type === 'array'

			if (data.has(`frontmatter.upload.${key}`)) {
				const files = data.getAll(`frontmatter.upload.${key}`) as File[]

				// html spec returns an empty file by design!
				const streams = files
					.filter((f) => f.size > 0)
					.map((file) => Readable.fromWeb(file.stream() as ReadableStream<BufferLike>))

				if (streams.length) {
					if (isArray) {
						markdown = await piece.setField(markdown, key, streams)
					} else {
						markdown = await piece.setField(markdown, key, streams[0])
					}
				}
			}

			if (data.has(`frontmatter.${key}`)) {
				const inputs = data.getAll(`frontmatter.${key}`).filter((input) => input !== '')

				if (inputs.length) {
					if (isArray) {
						markdown = await piece.setField(markdown, key, inputs)
					} else {
						markdown = await piece.setField(markdown, key, inputs[0])
					}
				}
			}

			if (data.has(`remove.${key}`)) {
				const removes = data.getAll(`remove.${key}`).filter((remove) => remove !== '')

				if (removes.length) {
					if (isArray) {
						for (const remove of removes) {
							markdown = await piece.removeField(markdown, key, remove as string)
						}
					} else {
						markdown = await piece.removeField(markdown, key)
					}
				}
			}
		}

		await piece.write(markdown)
	}
} satisfies Actions
