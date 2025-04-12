import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'
import type { BufferLike } from 'webdav'
import { Piece, type PieceFrontmatter, type PieceMarkdown } from '@luzzle/cli'

async function extractFrontmatterFromFormData<T extends PieceFrontmatter>(
	piece: Piece<T>,
	formData: FormData
) {
	let markdown: PieceMarkdown<T> = { frontmatter: {} as T, filePath: '.', piece: piece.type }

	for (const field of piece.fields) {
		const key = field.name
		const isArray = field.type === 'array'

		if (formData.has(`frontmatter.upload.${key}`)) {
			const files = formData.getAll(`frontmatter.upload.${key}`) as File[]

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

export { extractFrontmatterFromFormData }
