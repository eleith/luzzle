import { queryField, intArg } from 'nexus'
import resolve, { SKIP_DEFAULT, TAKE_DEFAULT } from '../resolvers/queryBooks'

export default queryField((t) => {
  t.list.field('books', {
    type: 'Book',
    args: {
      skip: intArg({ default: SKIP_DEFAULT }),
      take: intArg({ default: TAKE_DEFAULT }),
    },
    resolve,
  })
})
