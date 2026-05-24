import path from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import mime from 'mime-types'
import type { RequestHandler } from '@sveltejs/kit'
import { config } from '$lib/server/config'

export const GET: RequestHandler = async ({ params }) => {
	const jobId = params.jobId
	const asset = params.asset

	if (!jobId || !asset) {
		return new Response('forbidden', { status: 403 })
	}

	const baseDir = path.resolve(path.dirname(config.paths.assets), 'previews', jobId)
	const absolutePath = path.resolve(baseDir, asset)

	if (!absolutePath.startsWith(baseDir)) {
		return new Response('forbidden', { status: 403 })
	}

	try {
		const stats = await fs.promises.stat(absolutePath)
		if (!stats.isFile()) {
			return new Response('not found', { status: 404 })
		}

		const stream = fs.createReadStream(absolutePath)
		const responseType = mime.lookup(absolutePath) || 'application/octet-stream'
		const webStream = Readable.toWeb(stream) as ReadableStream

		return new Response(webStream, {
			headers: {
				'Content-Type': responseType,
				'Content-Length': stats.size.toString(),
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		})
	} catch {
		return new Response('not found', { status: 404 })
	}
}
