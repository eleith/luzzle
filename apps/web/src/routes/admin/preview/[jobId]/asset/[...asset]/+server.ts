import path from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import mime from 'mime-types'
import type { RequestHandler } from '@sveltejs/kit'
import { config } from '$lib/server/config'
import { isSafeRelativePath, isWithinDirectory } from '$lib/server/asset-paths'

export const GET: RequestHandler = async ({ params }) => {
	const jobId = params.jobId
	const asset = params.asset

	if (
		!jobId ||
		!asset ||
		jobId.includes('/') ||
		!isSafeRelativePath(jobId) ||
		!isSafeRelativePath(asset)
	) {
		return new Response('forbidden', { status: 403 })
	}

	const previewRoot = path.resolve(path.dirname(config.paths.assets), 'previews')
	const baseDir = path.resolve(previewRoot, jobId)
	const absolutePath = path.resolve(baseDir, asset)

	if (!isWithinDirectory(previewRoot, baseDir) || !isWithinDirectory(baseDir, absolutePath)) {
		return new Response('forbidden', { status: 403 })
	}

	try {
		const realRoot = await fs.promises.realpath(previewRoot)
		const realBase = await fs.promises.realpath(baseDir)
		if (!isWithinDirectory(realRoot, realBase)) {
			return new Response('forbidden', { status: 403 })
		}

		const realFile = await fs.promises.realpath(absolutePath)
		if (!isWithinDirectory(realBase, realFile)) {
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
	} catch {
		return new Response('not found', { status: 404 })
	}
}
