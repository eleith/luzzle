import { GraphQLDateTime } from 'graphql-scalars'
import {
  queryType,
  makeSchema,
  objectType,
  stringArg,
  nonNull,
  asNexusMethod,
  intArg,
  nullable,
  booleanArg,
} from 'nexus'
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
        random: nullable(booleanArg({ default: false })),
      },
      resolve: async (_parent, args, ctx) => {
        const { take, random } = args
        if (random) {
          const count = await ctx.prisma.book.count()
          const skip = Math.floor(Math.random() * count)
          return ctx.prisma.book.findMany({ take: 1, skip })
        } else {
          return ctx.prisma.book.findMany({ take, orderBy: { date_added: 'asc' } })
        }
      },
    })
    t.field('book', {
      type: 'Book',
      args: {
        id: nonNull(stringArg()),
      },
      resolve: async (_parent, args, ctx) => {
        return ctx.prisma.book.findUnique({ where: { id: args.id } })
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
