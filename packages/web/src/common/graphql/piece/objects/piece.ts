import builder from '@app/lib/graphql/builder'
import { LuzzleSelectable } from '@luzzle/kysely'
import { Tag } from '../../tag'

const PieceBuilder = builder.objectRef<LuzzleSelectable<'pieces_view'>>('Piece')
const PieceSiblings = builder
	.objectRef<{
		next?: LuzzleSelectable<'pieces_view'> | null
		previous?: LuzzleSelectable<'pieces_view'> | null
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
		dateOrder: t.exposeFloat('date_order'),
		type: t.exposeString('from_piece', { nullable: false }),
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
					.selectFrom('pieces_view')
					.select('slug')
					.orderBy('date_order', 'desc')
					.orderBy('slug', 'asc')
					.where(({ and, or, cmpr }) => {
						return or([
							cmpr('date_order', '<', parent.date_order),
							and([cmpr('date_order', '=', parent.date_order), cmpr('slug', '>', parent.slug)]),
						])
					})
					.executeTakeFirst()

				const before = await ctx.db
					.selectFrom('pieces_view')
					.select('slug')
					.orderBy('date_order', 'asc')
					.orderBy('slug', 'desc')
					.where(({ and, or, cmpr }) => {
						return or([
							cmpr('date_order', '>', parent.date_order),
							and([cmpr('date_order', '=', parent.date_order), cmpr('slug', '<', parent.slug)]),
						])
					})
					.executeTakeFirst()

				const previous = before
					? await ctx.db
							.selectFrom('pieces_view')
							.selectAll()
							.where('slug', '=', before.slug)
							.executeTakeFirst()
					: null

				const next = after
					? await ctx.db
							.selectFrom('pieces_view')
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
