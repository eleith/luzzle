import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPieces, promptToPiece } from '$lib/pieces'
import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'
import type { BufferLike } from 'webdav'
import type { PieceFrontmatter, PieceMarkdown } from '@luzzle/core'

export const load: PageServerLoad = async ({ params }) => {
	const directory = params.directory || ''
	const pieces = getPieces()
	const types = await pieces.getTypes()

	return {
		types,
		directory
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
				markdown,
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
		const note = formData.get('note')
		const types = await pieces.getTypes()
		let markdown: PieceMarkdown<PieceFrontmatter>

		if (!type || !types.includes(type)) {
			return error(404, `piece type does not exist`)
		}

		const piece = await pieces.getPiece(type)

		try {
			markdown = await piece.create(directory, name as string)
			markdown.note = (note as string) || ''

			for (const field of piece.fields) {
				const key = field.name
				const isArray = field.type === 'array'

				if (formData.has(`upload.${key}`)) {
					const files = formData.getAll(`frontmatter.upload.${key}`) as File[]

					// html spec returns an empty file by design!
					const streams = files.filter((f) => f.size > 0).map((file) =>
						Readable.fromWeb(file.stream() as ReadableStream<BufferLike>)
					)

					if (streams.length) {
						if (isArray) {
							markdown = await piece.setField(markdown, key, streams)
						} else {
							markdown = await piece.setField(markdown, key, streams[0])
						}
					}
				}

				if (formData.has(`frontmatter.${key}`)) {
					const inputs = formData.getAll(`frontmatter.${key}`).filter((input) => input !== '')

					if (inputs.length) {
						if (isArray) {
							markdown = await piece.setField(markdown, key, inputs)
						} else {
							markdown = await piece.setField(markdown, key, inputs[0])
						}
					}
				}
			}
		}
		catch (e) {
			return fail(400, { error: { message: `failed to create piece: ${e}` } })
		}

		await piece.write(markdown)

		redirect(303, `/pieces/list/${markdown.filePath}`)
	}
} satisfies Actions
