import { isConfiguredPieceType } from '#lib/pieces/types.server.js'
import { getPieces } from '#lib/server/pieces.js'

function isCanonicalMarkdownPath(value: unknown): value is string {
	if (typeof value !== 'string') return false
	if (!value || /[\\\p{Control}]/u.test(value) || /^[A-Za-z]:/.test(value)) return false
	if (!value.endsWith('.md')) return false
	return value.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
}

export function validatePublicationPath(value: unknown): string | Response {
	if (!isCanonicalMarkdownPath(value)) {
		return Response.json({ message: 'Expected a canonical Markdown filePath' }, { status: 400 })
	}
	const { type, format } = getPieces().parseFilename(value)
	if (!type || format !== '.md' || !isConfiguredPieceType(type)) {
		return Response.json({ message: 'Unsupported piece type' }, { status: 400 })
	}
	return value
}
