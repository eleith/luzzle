import { objectType } from 'nexus'

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
    t.int('year_read')
    t.int('month_read')
    t.int('cover_width')
    t.int('cover_height')
  },
})

export default Book
