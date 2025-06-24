import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getDatabase } from '$lib/database'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug
	const db = getDatabase()

	const piece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!piece) {
		return error(404, `piece does not exist`)
	}

	const tags = await db
		.selectFrom('web_pieces_tags')
		.selectAll()
		.where('piece_id', '=', piece.id)
		.execute()

	const after = await db
		.selectFrom('web_pieces')
		.select('slug')
		.orderBy('date_consumed', 'desc')
		.orderBy('date_added', 'desc')
		.where('type', '=', type)
		.where('id', '!=', piece.id)
		.where(({ eb, or, and }) => {
			if (piece.date_consumed === null) {
				return and([eb('date_consumed', 'is', null), eb('date_added', '<', piece.date_added)])
			} else {
				return or([
					and([eb('date_consumed', 'is not', null), eb('date_consumed', '<', piece.date_consumed)]),
					and([
						eb('date_consumed', '=', piece.date_consumed),
						eb('date_added', '<', piece.date_added)
					]),
					and([eb('date_consumed', 'is', null)])
				])
			}
		})
		.limit(1)
		.executeTakeFirst()

	const before = await db
		.selectFrom('web_pieces')
		.select('slug')
		.orderBy('date_consumed', 'asc')
		.orderBy('date_added', 'asc')
		.where('type', '=', type)
		.where(({ eb, or, and }) => {
			if (piece.date_consumed === null) {
				return or([
					and([eb('date_consumed', 'is', null), eb('date_added', '>', piece.date_added)]),
					and([eb('date_consumed', 'is not', null)])
				])
			} else {
				return or([
					and([eb('date_consumed', 'is not', null), eb('date_consumed', '>', piece.date_consumed)]),
					and([
						eb('date_consumed', '=', piece.date_consumed),
						eb('date_added', '>', piece.date_added)
					])
				])
			}
		})
		.executeTakeFirst()

	const previous = before
		? await db
				.selectFrom('web_pieces')
				.selectAll()
				.where('slug', '=', before.slug)
				.where('type', '=', type)
				.executeTakeFirst()
		: null

	const next = after
		? await db
				.selectFrom('web_pieces')
				.selectAll()
				.where('slug', '=', after.slug)
				.where('type', '=', type)
				.executeTakeFirst()
		: null

	return {
		piece,
		previous,
		next,
		tags
	}
}
