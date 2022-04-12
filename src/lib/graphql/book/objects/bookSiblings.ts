import { objectType } from 'nexus'

const BookSiblings = objectType({
  name: 'BookSiblings',
  definition(t) {
    t.field('previous', { type: 'Book' })
    t.field('next', { type: 'Book' })
  },
})

export default BookSiblings
