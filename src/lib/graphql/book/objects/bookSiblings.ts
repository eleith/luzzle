import builder from '@app/graphql/builder'
import BookObject from './book'

const BookSiblings = builder.simpleObject('BookSiblings', {
  description: 'next and previously read books',
  fields: (t) => ({
    next: t.field({
      type: BookObject,
    }),
    previous: t.field({
      type: BookObject,
    }),
  }),
})

export default BookSiblings
