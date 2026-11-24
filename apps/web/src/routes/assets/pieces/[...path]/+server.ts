import path from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import mime from 'mime-types'
import type { RequestHandler } from '@sveltejs/kit'
import { isSafeRelativePath, isWithinDirectory } from '#lib/server/asset-paths.js'

export const GET: RequestHandler = async ({ params }) => {
	const { path: assetPath } = params

	if (!assetPath || !isSafeRelativePath(assetPath)) {
		return new Response('forbidden', { status: 403 })
	}

	const baseDir = path.resolve('assets/pieces')
	const absolutePath = path.resolve(baseDir, assetPath)

	if (!isWithinDirectory(baseDir, absolutePath)) {
		return new Response('forbidden', { status: 403 })
	}

	try {
		const realRoot = await fs.promises.realpath(baseDir)
		const realFile = await fs.promises.realpath(absolutePath)
		if (!isWithinDirectory(realRoot, realFile)) {
			return new Response('forbidden', { status: 403 })
		}

		const stats = await fs.promises.stat(realFile)
		if (!stats.isFile()) {
			return new Response('not found', { status: 404 })
		}

		const stream = fs.createReadStream(realFile)
		const responseType = mime.lookup(absolutePath) || 'application/octet-stream'
		const webStream = Readable.toWeb(stream) as ReadableStream

		return new Response(webStream, {
			headers: {
				'Content-Type': responseType,
				'Content-Length': stats.size.toString(),
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		})
	} catch (error) {
		console.log(error)
		return new Response('not found', { status: 404 })
	}
}
