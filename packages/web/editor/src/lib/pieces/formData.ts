import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'
import type { BufferLike } from 'webdav'
import { Piece, type PieceFrontmatter, type PieceMarkdown } from '@luzzle/core'

async function extractFrontmatterFromFormData<T extends PieceFrontmatter>(
	piece: Piece<T>,
	_markdown: PieceMarkdown<T>,
	formData: FormData
) {
	let markdown = { ..._markdown }

	for (const field of piece.fields) {
		const key = field.name
		const isArray = field.type === 'array'

		if (formData.has(`frontmatter.remove.${key}`)) {
			markdown = await piece.removeField(markdown, key)
		}

		if (formData.has(`frontmatter.download.${key}`)) {
			const downloads = formData.getAll(`frontmatter.download.${key}`) as string[]
			const urls = downloads.filter((url) => url.length)

			try {
				if (urls.length) {
					if (isArray) {
						markdown = await piece.setField(markdown, key, urls)
					} else {
						markdown = await piece.setField(markdown, key, urls[0])
					}
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error'
				console.error(`Error downloading file: ${urls.join(', ')} with error: ${message}`)
			}
		}

		if (formData.has(`frontmatter.upload.${key}`)) {
			const files = formData.getAll(`frontmatter.upload.${key}`) as File[]

			try {
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
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error'
				console.error(
					`Error uploading file: ${files.map((f) => f.name).join(', ')} with error: ${message}`
				)
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

	return markdown.frontmatter
}

async function extractNoteFromFormData(formData: FormData) {
	const note = formData.get('note') || ''

	return note.toString().replace(/\r\n/g, '\n')
}

export { extractFrontmatterFromFormData, extractNoteFromFormData }
