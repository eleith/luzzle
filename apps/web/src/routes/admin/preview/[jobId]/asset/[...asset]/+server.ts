import path from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import mime from 'mime-types'
import type { RequestHandler } from '@sveltejs/kit'
import { config } from '$lib/server/config'

function isWithin(directory: string, file: string): boolean {
	const relative = path.relative(directory, file)
	return (
		relative !== '' &&
		relative !== '..' &&
		!relative.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relative)
	)
}

export const GET: RequestHandler = async ({ params }) => {
	const jobId = params.jobId
	const asset = params.asset

	if (
		!jobId ||
		!asset ||
		jobId.includes('/') ||
		[jobId, ...asset.split('/')].some(
			(segment) =>
				!segment ||
				segment === '.' ||
				segment === '..' ||
				segment.includes('\\') ||
				segment.includes('\0')
		)
	) {
		return new Response('forbidden', { status: 403 })
	}

	const previewRoot = path.resolve(path.dirname(config.paths.assets), 'previews')
	const baseDir = path.resolve(previewRoot, jobId)
	const absolutePath = path.resolve(baseDir, asset)

	if (!isWithin(previewRoot, baseDir) || !isWithin(baseDir, absolutePath)) {
		return new Response('forbidden', { status: 403 })
	}

	try {
		const realRoot = await fs.promises.realpath(previewRoot)
		const realBase = await fs.promises.realpath(baseDir)
		if (!isWithin(realRoot, realBase)) {
			return new Response('forbidden', { status: 403 })
		}

		const realFile = await fs.promises.realpath(absolutePath)
		if (!isWithin(realBase, realFile)) {
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
