import { queryType, makeSchema, objectType } from 'nexus'
import { nexusPrisma } from 'nexus-plugin-prisma'
import path from 'path'

const Query = queryType({
  definition(t) {
    t.string('hello', { resolve: () => 'hello world' })
  },
})

const Book = objectType({
  name: 'Book',
  definition(t) {
    t.model.id()
    t.model.title()
  },
})

export const schema = makeSchema({
  types: [Query, Book],
  plugins: [nexusPrisma({ experimentalCRUD: true })],
  outputs: {
    typegen: path.join(process.cwd(), 'generated', 'nexus-typegen.ts'),
    schema: path.join(process.cwd(), 'generated', 'schema.graphql'),
  },
})
