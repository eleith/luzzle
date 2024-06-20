import builder from '@app/lib/graphql/builder'
import { LuzzleSelectable } from '@luzzle/core'
import { Tag } from '../../tag'

const TextBuilder = builder.objectRef<LuzzleSelectable<'games'>>('Game')
const TextSiblings = builder
	.objectRef<{
		next?: LuzzleSelectable<'games'> | null
		previous?: LuzzleSelectable<'games'> | null
	}>('GameSiblings')
	.implement({
		fields: (t) => ({
			next: t.field({ type: TextBuilder, resolve: (x) => x.next }),
			previous: t.field({ type: TextBuilder, resolve: (x) => x.previous }),
		}),
	})

export default TextBuilder // avoid circular issues

TextBuilder.implement({
	fields: (t) => ({
		id: t.exposeID('id', { nullable: false }),
		title: t.exposeString('title', { nullable: false }),
		slug: t.exposeString('slug', { nullable: false }),
		note: t.exposeString('note'),
		dateUpdated: t.exposeFloat('date_updated'),
		dateAdded: t.exposeFloat('date_added', { nullable: false }),
		datePublished: t.exposeFloat('date_published'),
		description: t.exposeString('description'),
		representativeImage: t.exposeString('representative_image'),
		publisher: t.exposeString('publisher'),
		developer: t.exposeString('developer'),
		playedOn: t.exposeString('played_on'),
		datePlayed: t.exposeFloat('date_played'),
		numberOfPlayers: t.exposeInt('number_of_players'),
		url: t.exposeString('url'),
		type: t.exposeString('type', { nullable: false }),
		tags: t.field({
			type: [Tag],
			resolve: async (parent, _, ctx) => {
				const tagMaps = await ctx.db
					.selectFrom('tag_maps')
					.selectAll()
					.where('id_item', '=', parent.id)
					.execute()

				const tags = await ctx.db
					.selectFrom('tags')
					.selectAll()
					.where(
						'id',
						'in',
						tagMaps.map((x) => x.id_tag)
					)
					.execute()
				return tags
			},
		}),
		siblings: t.field({
			type: TextSiblings,
			resolve: async (parent, _, ctx) => {
				const after = await ctx.db
					.selectFrom('games')
					.select('slug')
					.orderBy('date_played', 'desc')
					.orderBy('slug', 'asc')
					.where(({ and, or, eb }) => {
						return or([
							eb('date_played', '<', parent.date_played),
							and([eb('date_played', '=', parent.date_played), eb('slug', '>', parent.slug)]),
						])
					})
					.executeTakeFirst()

				const before = await ctx.db
					.selectFrom('games')
					.select('slug')
					.orderBy('date_played', 'asc')
					.orderBy('slug', 'desc')
					.where(({ and, or, eb }) => {
						return or([
							eb('date_played', '>', parent.date_played),
							and([eb('date_played', '=', parent.date_played), eb('slug', '<', parent.slug)]),
						])
					})
					.executeTakeFirst()

				const previous = before
					? await ctx.db
							.selectFrom('games')
							.selectAll()
							.where('slug', '=', before.slug)
							.executeTakeFirst()
					: null

				const next = after
					? await ctx.db
							.selectFrom('games')
							.selectAll()
							.where('slug', '=', after.slug)
							.executeTakeFirst()
					: null

				return {
					previous,
					next,
				}
			},
		}),
	}),
})
