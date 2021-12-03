import { getBookSize, getCoverPath, makeBook } from '@app/common/components/books'
import Page from '@app/common/components/page'
import useGraphSWR from '@app/common/hooks/useGraphSWR'
import { gql } from '@app/gql'
import localRequest from '@app/lib/graphql/localRequest'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/types'
import Link from 'next/link'
import { Box, Container, Flex } from 'theme-ui'
import { useLoading, Rings } from '@agney/react-loading'

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
  const coverUrl = book.cover_width ? getCoverPath(book.slug) : undefined
  const cover = makeBook(getBookSize(book.pages || 200), coverUrl)

  return (
    <Box key={book.id} sx={{ position: 'relative' }}>
      <Link href={`/books/${book.id}`}>{cover}</Link>
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
  const { data: randomBook, error } = useGraphSWR(getRandomBookQuery)
  const { containerProps, indicatorEl } = useLoading({
    loading: true,
    indicator: <Rings width="50" />,
  })

  return (
    <Page meta={{ title: 'home' }}>
      <Container sx={{ width: '70%' }}>
        <Flex sx={{ flexWrap: 'wrap' }} {...containerProps}>
          {books.map((book) => makeBookCard(book))}
          {randomBook?.books?.length ? makeBookCard(randomBook?.books?.[0] as Book) : indicatorEl}
        </Flex>
      </Container>
    </Page>
  )
}
