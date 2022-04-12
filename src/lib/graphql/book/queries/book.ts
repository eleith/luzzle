import { stringArg, queryField } from 'nexus'
import queryBookResolver from '../resolvers/queryBook'

export default queryField((t) => {
  t.field('book', {
    type: 'Book',
    args: {
      id: stringArg(),
      slug: stringArg(),
    },
    resolve: queryBookResolver,
  })
})
