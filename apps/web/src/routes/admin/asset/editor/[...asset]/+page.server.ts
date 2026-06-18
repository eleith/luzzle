import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getStorage } from '$lib/server/storage'
import path from 'path'
import type { LuzzleStorage } from '@luzzle/core'

async function isBinaryFile(storage: LuzzleStorage, assetPath: string): Promise<boolean> {
	return new Promise((resolve) => {
		const stream = storage.createReadStream(assetPath)
		let resolved = false

		stream.on('data', (chunk: string | Buffer) => {
			if (resolved) return
			const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
			for (let i = 0; i < Math.min(buf.length, 1024); i++) {
				if (buf[i] === 0) {
					resolved = true
					resolve(true)
					stream.destroy()
					return
				}
			}
			resolved = true
			resolve(false)
			stream.destroy()
		})

		stream.on('end', () => {
			if (!resolved) {
				resolved = true
				resolve(false)
			}
		})

		stream.on('error', () => {
			if (!resolved) {
				resolved = true
				resolve(false)
			}
		})
	})
}

export const load: PageServerLoad = async ({ params, url }) => {
	const assetPath = path.normalize(params.asset)
	const storage = getStorage()

	const exists = await storage.exists(assetPath)

	const parentDir = path.dirname(assetPath)
	const defaultReturnUrl = `/admin/directory/${parentDir === '.' ? '' : parentDir}`

	const returnTo = url.searchParams.get('returnTo') || defaultReturnUrl || '/admin'

	if (!exists) {
		return {
			path: assetPath,
			filename: path.basename(assetPath),
			size: 0,
			lastModified: 0,
			isImage: /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(assetPath),
			isBinary: false,
			content: null,
			returnTo,
			exists: false
		}
	}

	const fileStat = await storage.stat(assetPath)
	const isImage = /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(assetPath)

	let isBinary = false
	let content: string | null = null

	if (fileStat.size < 500 * 1024 && !isImage) {
		isBinary = await isBinaryFile(storage, assetPath)
		if (!isBinary) {
			content = (await storage.readFile(assetPath, 'text')) as string
		}
	} else {
		isBinary = true
	}

	return {
		path: assetPath,
		filename: path.basename(assetPath),
		size: fileStat.size,
		lastModified: fileStat.last_modified,
		isImage,
		isBinary,
		content,
		returnTo,
		exists: true
	}
}

export const actions = {
	save: async ({ params, request }) => {
		const assetPath = path.normalize(params.asset)
		const storage = getStorage()

		const exists = await storage.exists(assetPath)
		if (!exists) {
			return fail(404, { error: { message: 'Asset not found' } })
		}

		const formData = await request.formData()
		const content = formData.get('content')?.toString()

		if (content === undefined) {
			return fail(400, { error: { message: 'Content is required' } })
		}

		try {
			await storage.writeFile(assetPath, content)
			return { success: true }
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			return fail(500, { error: { message: `Failed to save asset: ${message}` } })
		}
	},
	delete: async ({ params, url }) => {
		const assetPath = path.normalize(params.asset)
		const storage = getStorage()

		const exists = await storage.exists(assetPath)
		if (!exists) {
			return fail(404, { error: { message: 'Asset not found' } })
		}

		const returnTo = url.searchParams.get('returnTo') || '/admin'

		try {
			await storage.delete(assetPath)
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			return fail(500, { error: { message: `Failed to delete asset: ${message}` } })
		}

		throw redirect(303, returnTo)
	}
} satisfies Actions
