import builder from '@app/lib/graphql/builder'
import BookObject from '../../book/objects/book'
import Fuse from 'fuse.js'
import { Book } from '@luzzle/prisma'

const MAX_RESULTS = 10
let allBooks: Array<Book> = []

builder.queryFields((t) => ({
  search: t.field({
    errors: {
      types: [Error],
    },
    type: [BookObject],
    args: {
      query: t.arg({ type: 'String', required: true }),
    },
    resolve: async (_, args, ctx) => {
      if (allBooks.length === 0) {
        allBooks = await ctx.prisma.book.findMany({
          orderBy: { read_order: 'desc' },
        })
      }

      const keys = [
        { name: 'title', weight: 4 },
        { name: 'author', weight: 3 },
        { name: 'coauthor', weight: 1 },
        { name: 'subtitle', weight: 2 },
      ]

      const fuse = new Fuse(allBooks, { keys })
      const items = fuse.search(args.query, { limit: MAX_RESULTS })
      const books = items.map((result) => result.item)

      return books
    },
  }),
}))
