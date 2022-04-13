import { stringArg, queryField } from 'nexus'
import resolve from '../resolvers/queryBook'

export default queryField((t) => {
  t.field('book', {
    type: 'Book',
    args: {
      id: stringArg(),
      slug: stringArg(),
    },
    resolve,
  })
})
