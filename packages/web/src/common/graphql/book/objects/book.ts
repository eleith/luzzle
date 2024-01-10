import builder from '@app/lib/graphql/builder'
import { PieceSelectable } from '@luzzle/kysely'
import { Tag } from '../../tag'

const BookBuilder = builder.objectRef<PieceSelectable<'books'>>('Book')
const BookSiblings = builder
	.objectRef<{
		next?: PieceSelectable<'books'> | null
		previous?: PieceSelectable<'books'> | null
	}>('BookSiblings')
	.implement({
		fields: (t) => ({
			next: t.field({ type: BookBuilder, resolve: (x) => x.next }),
			previous: t.field({ type: BookBuilder, resolve: (x) => x.previous }),
		}),
	})

export default BookBuilder // avoid circular issues

BookBuilder.implement({
	fields: (t) => ({
		id: t.exposeID('id', { nullable: false }),
		title: t.exposeString('title', { nullable: false }),
		slug: t.exposeString('slug', { nullable: false }),
		subtitle: t.exposeString('subtitle'),
		author: t.exposeString('author', { nullable: false }),
		idOlBook: t.exposeString('id_ol_book'),
		idOlWork: t.exposeString('id_ol_work'),
		isbn: t.exposeString('isbn'),
		coauthors: t.exposeString('coauthors'),
		description: t.exposeString('description'),
		keywords: t.exposeString('keywords'),
		note: t.exposeString('note'),
		pages: t.exposeInt('pages'),
		yearFirstPublished: t.exposeInt('year_first_published'),
		dateUpdated: t.exposeFloat('date_updated'),
		dateAdded: t.exposeFloat('date_added', { nullable: false }),
		dateRead: t.exposeFloat('date_read'),
		cover: t.exposeString('cover'),
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
			type: BookSiblings,
			resolve: async (parent, _, ctx) => {
				const all = await ctx.db
					.selectFrom('books')
					.select('slug')
					.orderBy('date_read', 'desc')
					.execute()

				const find = all.findIndex((x) => x.slug === parent.slug)
				const beforeSlug = all[find - 1]?.slug
				const afterSlug = all[find + 1]?.slug

				const before = beforeSlug
					? await ctx.db
							.selectFrom('books')
							.selectAll()
							.where('slug', '=', beforeSlug)
							.executeTakeFirst()
					: null

				const after = afterSlug
					? await ctx.db
							.selectFrom('books')
							.selectAll()
							.where('slug', '=', afterSlug)
							.executeTakeFirst()
					: null

				return {
					previous: before,
					next: after,
				}
			},
		}),
	}),
})
