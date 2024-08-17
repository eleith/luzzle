import builder from '@app/lib/graphql/builder'
import { Tag } from '../../tag'

export const WebPieceTypes = ['books', 'links', 'texts', 'games', 'films'] as const
export const WebPieceTypesRegExp = RegExp(WebPieceTypes.join('|'))

export interface WebPieces {
	id: string
	title: string
	slug: string
	note: string
	date_updated: number
	date_added: number
	date_consumed: number
	type: [typeof WebPieceTypes][number][number]
	media: string
	json_metadata: string
	summary: string
}

export interface WebPiecesFTS5 {
	id: string
	title: string
	slug: string
	note: string
	date_updated: number
	date_added: number
	date_consumed: number
	type: [typeof WebPieceTypes][number][number]
	media: string
	json_metadata: string
	summary: string
}

const PieceBuilder = builder.objectRef<WebPieces>('Piece')
const PieceSiblings = builder
	.objectRef<{
		next?: WebPieces | null
		previous?: WebPieces | null
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
		metadata: t.exposeString('json_metadata'),
		summary: t.exposeString('summary'),
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
					.selectFrom('web_pieces')
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
					.selectFrom('web_pieces')
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
							.selectFrom('web_pieces')
							.selectAll()
							.where('slug', '=', before.slug)
							.executeTakeFirst()
					: null

				const next = after
					? await ctx.db
							.selectFrom('web_pieces')
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
