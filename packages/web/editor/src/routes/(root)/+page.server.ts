import { getPieces } from '$lib/pieces'
import { type Actions, fail } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import {
	PRIVATE_LUZZLE_DEPLOY_WEBHOOK,
	PRIVATE_LUZZLE_DEPLOY_WEBHOOK_BODY
} from '$env/static/private'

export const load: PageServerLoad = async () => {
	const pieces = getPieces()
	const files = await pieces.getFilesIn('.')

	return {
		files: {
			directories: files.directories,
			pieces: files.pieces.map((piece) => ({
				...pieces.parseFilename(piece)
			}))
		}
	}
}

export const actions = {
	deploy: async () => {
		try {
			const date = new Date().getTime()
			const api = new URL(PRIVATE_LUZZLE_DEPLOY_WEBHOOK)

			const response = await fetch(api, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: PRIVATE_LUZZLE_DEPLOY_WEBHOOK_BODY.replaceAll('%tag%', date.toString())
			})

			if (response.ok) {
				return { success: true }
			}

			throw new Error(`failed deploy: ${response.status} ${response.statusText}`)
		} catch (e) {
			return fail(400, { error: { message: `failed deploy: ${e}` } })
		}
	}
} satisfies Actions
