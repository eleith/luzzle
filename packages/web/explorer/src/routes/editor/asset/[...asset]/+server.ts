import path from 'path'
import type { RequestHandler } from './$types'
import { getStorage } from '$lib/server/storage'
import mime from 'mime-types'
import { Readable } from 'stream'

export const GET: RequestHandler = async ({ params, locals }) => {
	const assetPath = path.normalize(params.asset)
	const storage = getStorage()

	try {
		const stream = storage.createReadStream(assetPath)

		const responseType = mime.lookup(assetPath)
		const defaultType = 'application/octet-stream'
		const webStream = Readable.toWeb(stream) as ReadableStream

		return new Response(webStream, {
			headers: {
				'Content-Type': responseType ? responseType : defaultType
			}
		})
	} catch (error) {
		console.error(error)
		return new Response('asset not found', { status: 404 })
	}
}
