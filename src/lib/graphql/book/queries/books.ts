import { queryField, intArg, nonNull } from 'nexus'
import queryBooksResolver from '../resolvers/queryBooks'

export default queryField((t) => {
  t.list.field('books', {
    type: 'Book',
    args: {
      skip: intArg({ default: 0 }),
      take: nonNull(intArg({ default: 10 })),
    },
    resolve: queryBooksResolver,
  })
})
