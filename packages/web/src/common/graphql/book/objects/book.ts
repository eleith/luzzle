import builder from '@app/lib/graphql/builder'
import { PieceSelectable } from '@luzzle/kysely'
import BookSiblings from './bookSiblings'
import { Tag } from '../../tag'

const BookBuilder = builder.objectRef<PieceSelectable<'books'>>('Book')

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
		dateUpdated: t.field({
			type: 'Date',
			resolve: (x) => (x.date_updated ? new Date(x.date_updated) : null),
		}),
		dateAdded: t.field({ type: 'Date', resolve: (x) => new Date(x.date_added), nullable: false }),
		yearRead: t.exposeInt('year_read'),
		monthRead: t.exposeInt('month_read'),
		readOrder: t.exposeString('read_order', { nullable: false }),
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
				const before = await ctx.db
					.selectFrom('books')
					.selectAll()
					.where('read_order', '>', parent.read_order)
					.orderBy('read_order', 'asc')
					.limit(1)
					.executeTakeFirst()

				const after = await ctx.db
					.selectFrom('books')
					.selectAll()
					.where('read_order', '<', parent.read_order)
					.orderBy('read_order', 'desc')
					.limit(1)
					.executeTakeFirst()

				return {
					previous: before,
					next: after,
				}
			},
		}),
	}),
})
