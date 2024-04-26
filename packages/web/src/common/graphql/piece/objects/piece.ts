import builder from '@app/lib/graphql/builder'
import { LuzzleSelectable } from '@luzzle/core'
import { Tag } from '../../tag'

const PieceBuilder = builder.objectRef<LuzzleSelectable<'pieces'>>('Piece')
const PieceSiblings = builder
	.objectRef<{
		next?: LuzzleSelectable<'pieces'> | null
		previous?: LuzzleSelectable<'pieces'> | null
	}>('PieceSiblings')
	.implement({
		fields: (t) => ({
			next: t.field({ type: PieceBuilder, resolve: (x) => x.next }),
			previous: t.field({ type: PieceBuilder, resolve: (x) => x.previous }),
		}),
	})

export default PieceBuilder // avoid circular issues

PieceBuilder.implement({
	fields: (t) => ({
		id: t.exposeID('id', { nullable: false }),
		title: t.exposeString('title', { nullable: false }),
		slug: t.exposeString('slug', { nullable: false }),
		note: t.exposeString('note'),
		dateUpdated: t.exposeFloat('date_updated'),
		dateAdded: t.exposeFloat('date_added', { nullable: false }),
		dateOrder: t.exposeFloat('date_consumed'),
		type: t.exposeString('type', { nullable: false }),
		media: t.exposeString('media'),
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
			type: PieceSiblings,
			resolve: async (parent, _, ctx) => {
				const after = await ctx.db
					.selectFrom('pieces')
					.select('slug')
					.orderBy('date_consumed', 'desc')
					.orderBy('slug', 'asc')
					.where(({ and, or, eb }) => {
						return or([
							eb('date_consumed', '<', parent.date_consumed),
							and([eb('date_consumed', '=', parent.date_consumed), eb('slug', '>', parent.slug)]),
						])
					})
					.executeTakeFirst()

				const before = await ctx.db
					.selectFrom('pieces')
					.select('slug')
					.orderBy('date_consumed', 'asc')
					.orderBy('slug', 'desc')
					.where(({ and, or, eb }) => {
						return or([
							eb('date_consumed', '>', parent.date_consumed),
							and([eb('date_consumed', '=', parent.date_consumed), eb('slug', '<', parent.slug)]),
						])
					})
					.executeTakeFirst()

				const previous = before
					? await ctx.db
							.selectFrom('pieces')
							.selectAll()
							.where('slug', '=', before.slug)
							.executeTakeFirst()
					: null

				const next = after
					? await ctx.db
							.selectFrom('pieces')
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
