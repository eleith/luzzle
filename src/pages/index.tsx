import BookCover from '@app/common/components/books'
import Page from '@app/common/components/page'
import useGraphSWR from '@app/common/hooks/useGraphSWR'
import { gql } from '@app/gql'
import localRequest from '@app/lib/graphql/localRequest'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/types'
import Link from 'next/link'
import { Box, Container, Flex, Spinner } from 'theme-ui'
import VisuallyHidden from '@reach/visually-hidden'

const getTwoBooksQuery = gql(`query getTwoBooks {
  books(take: 2) {
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
  }
}`)

const getRandomBookQuery = gql(`query getRandomBook {
  books(random: true) {
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
  }
}`)

type Book = ExtractResultFieldTypeFor<typeof getTwoBooksQuery, 'books'>
type HomePageProps = { books: Book[] }

function makeBookCard(book: Book): JSX.Element {
  return (
    <Box key={book.id}>
      <Link href={`/books/${book.id}`} passHref>
        <BookCover backgroundImageUrl={`images/covers/${book.slug}.jpg`}>
          <VisuallyHidden>{book.title}</VisuallyHidden>
        </BookCover>
      </Link>
    </Box>
  )
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
  const response = await localRequest().query({ query: getTwoBooksQuery })
  const books = response.data?.books

  return {
    props: { books: (books as Book[]) || [] },
  }
}

export default function Home({ books }: HomePageProps): JSX.Element {
  const { data: randomBook } = useGraphSWR(getRandomBookQuery)

  return (
    <Page meta={{ title: 'home' }}>
      <Container sx={{ width: '70%' }}>
        <Flex sx={{ flexWrap: 'wrap' }}>
          {books.map((book) => makeBookCard(book))}
          {randomBook?.books?.length ? makeBookCard(randomBook?.books?.[0] as Book) : <Spinner />}
        </Flex>
      </Container>
    </Page>
  )
}
