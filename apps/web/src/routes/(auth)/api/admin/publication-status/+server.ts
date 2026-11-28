import { getPiecePublicationState } from '#lib/pieces/publication.server.js'
import { validatePublicationPath } from '#lib/server/publication-path.js'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url }) => {
	try {
		const filePath = validatePublicationPath(url.searchParams.get('filePath'))
		if (filePath instanceof Response) return filePath
		return Response.json(await getPiecePublicationState(filePath), {
			headers: { 'Cache-Control': 'no-store' }
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
