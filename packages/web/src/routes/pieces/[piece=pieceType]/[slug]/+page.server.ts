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
		.where(({ and, or, eb }) => {
			return or([
				eb('date_consumed', '<', piece.date_consumed),
				and([eb('date_consumed', '=', piece.date_consumed), eb('slug', '>', piece.slug)])
			])
		})
		.executeTakeFirst()

	const before = await db
		.selectFrom('web_pieces')
		.select('slug')
		.orderBy('date_consumed', 'asc')
		.orderBy('slug', 'desc')
		.where(({ and, or, eb }) => {
			return or([
				eb('date_consumed', '>', piece.date_consumed),
				and([eb('date_consumed', '=', piece.date_consumed), eb('slug', '<', piece.slug)])
			])
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
