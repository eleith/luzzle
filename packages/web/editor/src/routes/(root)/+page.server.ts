import { getPieces } from '$lib/pieces'
import { type Actions, fail } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import {
	PRIVATE_LUZZLE_DEPLOY_WEBHOOK,
	PRIVATE_LUZZLE_DEPLOY_WEBHOOK_BODY,
	PRIVATE_LUZZLE_DEPLOY_WEBHOOK_ACCESS_TOKEN
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
			const api = new URL(PRIVATE_LUZZLE_DEPLOY_WEBHOOK)

			const response = await fetch(api, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${PRIVATE_LUZZLE_DEPLOY_WEBHOOK_ACCESS_TOKEN}`
				},
				body: PRIVATE_LUZZLE_DEPLOY_WEBHOOK_BODY
			})

			if (response.ok) {
				console.log(response)
				console.log(await response.text())

				return { success: true }
			}

			throw new Error(`failed deploy: ${response.status} ${response.statusText}`)
		} catch (e) {
			return fail(400, { error: { message: `failed deploy: ${e}` } })
		}
	}
} satisfies Actions
