import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getDatabase } from '$lib/database'

const TAKE_DEFAULT = 50

export const load: PageServerLoad = async (page) => {
	const tag = page.params.tag
	const db = getDatabase()

	let piecesQuery = db.selectFrom('web_pieces').selectAll()
	const oneTag = await db
		.selectFrom('tags')
		.selectAll()
		.where('slug', '=', tag)
		.executeTakeFirstOrThrow()

	if (oneTag) {
		const tagMap = await db
			.selectFrom('tag_maps')
			.selectAll()
			.where('id_tag', '=', oneTag.id)
			.execute()

		piecesQuery = piecesQuery.where(
			'id',
			'in',
			tagMap.map((x) => x.id_item)
		)
	} else {
		return error(404, 'tag not found')
	}

	const pieces = await piecesQuery
		.orderBy('date_consumed', 'desc')
		.limit(TAKE_DEFAULT + 1)
		.execute()

	if (pieces.length === TAKE_DEFAULT + 1) {
		pieces.pop()
	}

	return {
		pieces,
		nextPage: pieces.length === TAKE_DEFAULT ? 2 : null,
		prevPage: null
	}
}

export const prerender = true
