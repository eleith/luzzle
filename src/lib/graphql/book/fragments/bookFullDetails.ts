import gql from 'graphql-tag'

const tag = gql(`fragment BookFullDetails on Book {
    id
    slug
    cover_width
    cover_height
    title
    coauthors
    description
    author
    isbn
    subtitle
    year_first_published
    pages
    year_read
    month_read
    read_order
    id_ol_work
    id_ol_book
}`)

export default tag
