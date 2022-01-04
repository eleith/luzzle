import { GraphQLDateTime } from 'graphql-scalars'
import { queryType, makeSchema, objectType, stringArg, nonNull, asNexusMethod, intArg } from 'nexus'
import path from 'path'

const DateTime = asNexusMethod(GraphQLDateTime, 'date')

const Book = objectType({
  name: 'Book',
  definition(t) {
    t.nonNull.id('id')
    t.nonNull.string('title')
    t.nonNull.string('slug')
    t.string('subtitle')
    t.string('author')
    t.string('id_ol_book')
    t.string('id_ol_work')
    t.string('isbn')
    t.string('coauthors')
    t.string('description')
    t.string('keywords')
    t.int('pages')
    t.int('year_first_published')
    t.date('date_updated')
    t.date('date_added')
    t.int('year_read')
    t.int('month_read')
    t.int('cover_width')
    t.int('cover_height')
  },
})

const Query = queryType({
  definition(t) {
    t.list.field('books', {
      type: 'Book',
      args: {
        take: nonNull(intArg({ default: 10 })),
      },
      resolve: async (_parent, args, ctx) => {
        const { take } = args

        return ctx.prisma.book.findMany({
          take,
          orderBy: [{ year_read: 'desc' }, { month_read: 'desc' }, { date_added: 'desc' }],
        })
      },
    })
    t.field('book', {
      type: 'Book',
      args: {
        id: stringArg(),
        slug: stringArg(),
      },
      resolve: async (_parent, args, ctx) => {
        const { slug, id } = args

        if (slug) {
          return ctx.prisma.book.findUnique({ where: { slug: slug } })
        } else if (id) {
          return ctx.prisma.book.findUnique({ where: { id: id } })
        } else {
          const count = await ctx.prisma.book.count()
          const skip = Math.floor(Math.random() * count)
          const books = await ctx.prisma.book.findMany({ take: 1, skip })
          return books[0]
        }
      },
    })
  },
})

export const schema = makeSchema({
  types: [Query, Book, DateTime],
  outputs: {
    typegen: path.join(process.cwd(), 'generated', 'nexus-typegen.ts'),
    schema: path.join(process.cwd(), 'generated', 'schema.graphql'),
  },
  contextType: {
    module: path.join(process.cwd(), 'src', 'lib', 'graphql', 'context.ts'),
    export: 'Context',
  },
})
