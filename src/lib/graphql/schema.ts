import { GraphQLDateTime } from 'graphql-scalars'
import { queryType, makeSchema, objectType, stringArg, nonNull, asNexusMethod } from 'nexus'
import path from 'path'

const DateTime = asNexusMethod(GraphQLDateTime, 'date')

const Book = objectType({
  name: 'Book',
  definition(t) {
    t.nonNull.id('id')
    t.nonNull.string('title')
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
  },
})

const Query = queryType({
  definition(t) {
    t.list.field('books', {
      type: 'Book',
      resolve: (_parent, _args, ctx) => {
        return ctx.prisma.book.findMany({})
      },
    })
    t.field('book', {
      type: 'Book',
      args: {
        id: nonNull(stringArg()),
      },
      resolve: (_parent, args, ctx) => {
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
