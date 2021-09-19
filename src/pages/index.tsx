import { gql } from '@app/gql'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/request'
import Page from '@app/common/components/page'
import { Container, Flex, Box } from 'theme-ui'
import { getBookSize, getCoverPath, makeBook } from '@app/common/components/books'
import Link from 'next/link'
import localRequest from '@app/lib/graphql/localRequest'

const booksQuery = gql(`query getBooks {
  books {
    id
    id_cover_image
    title
    coauthors
    description
    author
    isbn
    subtitle
    year_first_published
    pages
  }
}`)

type Book = ExtractResultFieldTypeFor<typeof booksQuery, 'books'>
type HomePageProps = { books: Book[] }

function makeBookCard(book: Book): JSX.Element {
  const coverUrl = book.id_cover_image ? getCoverPath(book.id_cover_image) : undefined
  const cover = makeBook(getBookSize(book.pages || 200), coverUrl)

  return (
    <Box key={book.id} sx={{ position: 'relative' }}>
      <Link href={`/books/${book.id}`}>{cover}</Link>
    </Box>
  )
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
  const response = await localRequest.query({ query: booksQuery })
  const books = response.data?.books
  return {
    props: { books: (books as Book[]) || [] },
  }
}

export default function Home({ books }: HomePageProps): JSX.Element {
  return (
    <Page meta={{ title: 'home' }}>
      <Container sx={{ width: '70%' }}>
        <Flex sx={{ flexWrap: 'wrap' }}>{books.map((book) => makeBookCard(book))}</Flex>
      </Container>
    </Page>
  )
}
