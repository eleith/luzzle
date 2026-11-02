import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { open } from 'node:fs/promises'
import path from 'node:path'
import { siteImageDefaults, type Config } from '@luzzle/web.config'
import { absoluteSiteImage, type SiteImage, type SiteImageUrls } from '#lib/site-images.js'

export const MAX_SITE_IMAGE_BYTES = 5 * 1024 * 1024

const imageTypes: Record<SiteImage, Readonly<Record<string, string>>> = {
	favicon: { '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' },
	opengraph: {
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.gif': 'image/gif'
	}
}

type ImageConfig = Pick<Config, 'content' | 'paths'>
interface ImageSnapshot {
	bytes: Uint8Array<ArrayBuffer>
	contentType: string
	etag: string
}

export function siteImageUrls(
	config: Pick<Config, 'content' | 'url'>,
	requestUrl: URL
): SiteImageUrls {
	const prefix = config.url.app_assets.replace(/\/+$/, '')
	function imageUrl(image: SiteImage): string {
		const source = config.content.images[image]
		return source === siteImageDefaults[image] ? `${prefix}${source}` : `/site-assets/${image}`
	}
	return {
		favicon: imageUrl('favicon'),
		opengraph: absoluteSiteImage(imageUrl('opengraph'), config.url.app, requestUrl)
	}
}

async function readImage(
	filename: string,
	contentType: string
): Promise<ImageSnapshot | undefined> {
	const file = await open(filename, constants.O_RDONLY | constants.O_NONBLOCK)
	try {
		const before = await file.stat({ bigint: true })
		if (!before.isFile() || before.size <= 0n || before.size > BigInt(MAX_SITE_IMAGE_BYTES)) return

		// One extra byte detects growth without allowing an unbounded read.
		const buffer = Buffer.allocUnsafe(Number(before.size) + 1)
		let length = 0
		while (length < buffer.length) {
			const { bytesRead } = await file.read(buffer, length, buffer.length - length, length)
			if (bytesRead === 0) break
			length += bytesRead
		}
		const after = await file.stat({ bigint: true })
		if (
			length !== Number(before.size) ||
			after.size !== before.size ||
			after.mtimeNs !== before.mtimeNs ||
			after.ctimeNs !== before.ctimeNs
		)
			return

		const bytes = new Uint8Array(buffer.subarray(0, length))
		return {
			bytes,
			contentType,
			etag: `"${createHash('sha256').update(bytes).digest('base64url')}"`
		}
	} finally {
		await file.close()
	}
}

async function loadImage(
	config: ImageConfig,
	image: SiteImage
): Promise<ImageSnapshot | undefined> {
	const source = config.content.images[image]
	if (source === siteImageDefaults[image]) return
	const contentType = imageTypes[image][path.extname(source).toLowerCase()]
	if (!contentType) return
	if (!path.isAbsolute(source) && !config.paths.config) return
	const filename = path.resolve(path.dirname(config.paths.config ?? ''), source)
	try {
		return await readImage(filename, contentType)
	} catch {
		// The configured source and filesystem errors must never reach a public response.
		return undefined
	}
}

function matchesEtag(header: string | null, etag: string): boolean {
	if (!header) return false
	return (
		header.trim() === '*' ||
		header.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag)
	)
}

function notFound(method: string): Response {
	return new Response(method === 'HEAD' ? null : 'Not found', {
		status: 404,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'content-length': '9',
			'cache-control': 'no-store',
			'x-content-type-options': 'nosniff'
		}
	})
}

/** Selected bytes (including failed reads) are restart-bound, just like configuration. */
export function createSiteImageHandler(config: ImageConfig) {
	const snapshots = new Map<SiteImage, Promise<ImageSnapshot | undefined>>()
	return async (image: string, request: Request): Promise<Response> => {
		if (image !== 'favicon' && image !== 'opengraph') return notFound(request.method)
		let pending = snapshots.get(image)
		if (!pending) {
			pending = loadImage(config, image)
			snapshots.set(image, pending)
		}
		const snapshot = await pending
		if (!snapshot) return notFound(request.method)

		const headers = new Headers({
			'content-type': snapshot.contentType,
			'cache-control': 'public, max-age=0, must-revalidate',
			'x-content-type-options': 'nosniff',
			etag: snapshot.etag
		})
		if (matchesEtag(request.headers.get('if-none-match'), snapshot.etag)) {
			return new Response(null, { status: 304, headers })
		}
		headers.set('content-length', String(snapshot.bytes.byteLength))
		return new Response(request.method === 'HEAD' ? null : snapshot.bytes, { headers })
	}
}
