import builder from '@app/lib/graphql/builder'
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
    idOlBook: t.exposeString('id_ol_book'),
    idOlWork: t.exposeString('id_ol_work'),
    isbn: t.exposeString('isbn'),
    coauthors: t.exposeString('coauthors'),
    description: t.exposeString('description'),
    keywords: t.exposeString('keywords'),
    pages: t.exposeInt('pages'),
    yearFirstPublished: t.exposeInt('year_first_published'),
    dateUpdated: t.field({ type: 'Date', resolve: (x) => x.date_updated, nullable: false }),
    dateAdded: t.field({ type: 'Date', resolve: (x) => x.date_added, nullable: false }),
    yearRead: t.exposeInt('year_read'),
    monthRead: t.exposeInt('month_read'),
    coverWidth: t.exposeInt('cover_width'),
    coverHeight: t.exposeInt('cover_height'),
    readOrder: t.exposeString('read_order', { nullable: false }),
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
