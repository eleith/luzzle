import { GraphQLDateTime } from 'graphql-scalars'
import { makeSchema, asNexusMethod } from 'nexus'
import path from 'path'
import { Book, BooksQuery, BookQuery } from '@app/graphql/book/index'

const DateTime = asNexusMethod(GraphQLDateTime, 'date')

export const schema = makeSchema({
  types: [DateTime, Book, BookQuery, BooksQuery],
  outputs: {
    typegen: path.join(process.cwd(), 'generated', 'nexus-typegen.ts'),
    schema: path.join(process.cwd(), 'generated', 'schema.graphql'),
  },
  contextType: {
    module: path.join(process.cwd(), 'src', 'lib', 'graphql', 'context.ts'),
    export: 'Context',
  },
})
