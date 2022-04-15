import builder from '@app/graphql/builder'
import { Book } from '@app/prisma'
import BookSiblings from './bookSiblings'

const BookBuilder = builder.objectRef<Book>('Book')

export default BookBuilder // avoid circular issues

BookBuilder.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    title: t.exposeString('title', { nullable: false }),
    slug: t.exposeString('slug', { nullable: false }),
    subtitle: t.exposeString('subtitle'),
    author: t.exposeString('author', { nullable: false }),
    id_ol_book: t.exposeString('id_ol_book'),
    id_ol_work: t.exposeString('id_ol_work'),
    isbn: t.exposeString('isbn'),
    coauthors: t.exposeString('coauthors'),
    description: t.exposeString('description'),
    keywords: t.exposeString('keywords'),
    pages: t.exposeInt('pages'),
    year_first_published: t.exposeInt('year_first_published'),
    date_updated: t.field({ type: 'Date', resolve: (x) => x.date_updated, nullable: false }),
    date_added: t.field({ type: 'Date', resolve: (x) => x.date_added, nullable: false }),
    year_read: t.exposeInt('year_read'),
    month_read: t.exposeInt('month_read'),
    cover_width: t.exposeInt('cover_width'),
    cover_height: t.exposeInt('cover_height'),
    read_order: t.exposeString('read_order', { nullable: false }),
    siblings: t.field({
      type: BookSiblings,
      resolve: async (parent, _, ctx) => {
        const before = await ctx.prisma.book.findMany({
          take: 1,
          skip: 1,
          orderBy: { read_order: 'desc' },
          cursor: { read_order: parent.read_order },
        })
        const after = await ctx.prisma.book.findMany({
          take: -1,
          skip: 1,
          orderBy: { read_order: 'desc' },
          cursor: { read_order: parent.read_order },
        })

        const previous = before[0]
        const next = after[0]

        return {
          previous,
          next,
        }
      },
    }),
  }),
})
