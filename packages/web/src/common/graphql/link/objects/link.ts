import builder from '@app/lib/graphql/builder'
import { PieceSelectable } from '@luzzle/kysely'
import { Tag } from '../../tag'

const LinkBuilder = builder.objectRef<PieceSelectable<'links'>>('Link')
const LinkSiblings = builder
	.objectRef<{
		next?: PieceSelectable<'links'> | null
		previous?: PieceSelectable<'links'> | null
	}>('LinkSiblings')
	.implement({
		fields: (t) => ({
			next: t.field({ type: LinkBuilder, resolve: (x) => x.next }),
			previous: t.field({ type: LinkBuilder, resolve: (x) => x.previous }),
		}),
	})

export default LinkBuilder // avoid circular issues

LinkBuilder.implement({
	fields: (t) => ({
		id: t.exposeID('id', { nullable: false }),
		title: t.exposeString('title', { nullable: false }),
		slug: t.exposeString('slug', { nullable: false }),
		subtitle: t.exposeString('subtitle'),
		author: t.exposeString('author'),
		coauthors: t.exposeString('coauthors'),
		summary: t.exposeString('summary'),
		keywords: t.exposeString('keywords'),
		note: t.exposeString('note'),
		dateUpdated: t.exposeFloat('date_updated'),
		dateAdded: t.exposeFloat('date_added', { nullable: false }),
		dateAccessed: t.exposeFloat('date_accessed'),
		isPaywall: t.exposeInt('is_paywall', { nullable: false }),
		isActive: t.exposeInt('is_active', { nullable: false }),
		type: t.exposeString('type', { nullable: false }),
		url: t.exposeString('url', { nullable: false }),
		archiveUrl: t.exposeString('archive_url'),
		representativeImage: t.exposeString('representative_image'),
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
			type: LinkSiblings,
			resolve: async (parent, _, ctx) => {
				const after = await ctx.db
					.selectFrom('links')
					.select('slug')
					.orderBy('date_accessed', 'desc')
					.orderBy('slug', 'asc')
					.where(({ and, or, cmpr }) => {
						return or([
							cmpr('date_accessed', '<', parent.date_accessed),
							and([
								cmpr('date_accessed', '=', parent.date_accessed),
								cmpr('slug', '>', parent.slug),
							]),
						])
					})
					.executeTakeFirst()

				const before = await ctx.db
					.selectFrom('links')
					.select('slug')
					.orderBy('date_accessed', 'asc')
					.orderBy('slug', 'desc')
					.where(({ and, or, cmpr }) => {
						return or([
							cmpr('date_accessed', '>', parent.date_accessed),
							and([
								cmpr('date_accessed', '=', parent.date_accessed),
								cmpr('slug', '<', parent.slug),
							]),
						])
					})
					.executeTakeFirst()

				const previous = before
					? await ctx.db
							.selectFrom('links')
							.selectAll()
							.where('slug', '=', before.slug)
							.executeTakeFirst()
					: null

				const next = after
					? await ctx.db
							.selectFrom('links')
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
