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

	const tagMaps = await db
		.selectFrom('tag_maps')
		.selectAll()
		.where('id_item', '=', piece.id)
		.execute()

	const tags = await db
		.selectFrom('tags')
		.selectAll()
		.where(
			'id',
			'in',
			tagMaps.map((x) => x.id_tag)
		)
		.execute()

	const after = await db
		.selectFrom('web_pieces')
		.select('slug')
		.orderBy('date_consumed', 'desc')
		.orderBy('slug', 'asc')
		.where('type', '=', type)
		.where(({ and, or, eb }) => {
			if (piece.date_consumed === null) {
				return and([eb('date_consumed', 'is', null), eb('date_added', '>', piece.date_added)])
			} else {
				return or([
					eb('date_consumed', '<', piece.date_consumed),
					eb('date_consumed', 'is', null),
					and([
						eb('date_consumed', '=', piece.date_consumed),
						eb('date_added', '>', piece.date_added)
					])
				])
			}
		})
		.executeTakeFirst()

	const before = await db
		.selectFrom('web_pieces')
		.select('slug')
		.orderBy('date_consumed', 'asc')
		.orderBy('slug', 'desc')
		.where('type', '=', type)
		.where(({ and, or, eb, selectFrom }) => {
			if (piece.date_consumed === null) {
				return or([
					and([eb('date_consumed', 'is', null), eb('date_added', '<', piece.date_added)]),
					eb(
						'date_consumed',
						'=',
						selectFrom('web_pieces')
							.select(({ fn }) => [fn.min('date_consumed').as('date_consumed')])
							.limit(1)
					)
				])
			} else {
				return or([
					eb('date_consumed', '>', piece.date_consumed),
					and([
						eb('date_consumed', '=', piece.date_consumed),
						eb('date_added', '<', piece.date_added)
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
				.executeTakeFirst()
		: null

	const next = after
		? await db
				.selectFrom('web_pieces')
				.selectAll()
				.where('slug', '=', after.slug)
				.executeTakeFirst()
		: null

	return {
		piece,
		previous,
		next,
		tags
	}
}

export const prerender = true
