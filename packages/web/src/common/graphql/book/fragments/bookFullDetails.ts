import gql from 'graphql-tag'

const tag = gql(`fragment BookFullDetails on Book {
    id
    slug
    cover
    title
    coauthors
    description
    author
    isbn
    subtitle
    yearFirstPublished
    pages
    yearRead
    monthRead
    readOrder
    idOlWork
    idOlBook
    note
}`)

export default tag
