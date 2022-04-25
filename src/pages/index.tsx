import BookCover from '@app/common/components/books'
import Page from '@app/common/components/page'
import useGraphSWR from '@app/common/hooks/useGraphSWR'
import gql from '@app/graphql/tag'
import { GetBookHomeDocument, GetRandomBookDocument } from './_gql_/index'
import localRequest from '@app/lib/graphql/localRequest'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/types'
import Link from 'next/link'
import config from '@app/common/config'
import { Box } from '@app/common/components/ui/Box'
import { Container } from '@app/common/components/ui/Container'
import { Grid } from '@app/common/components/ui/Grid'
import { Text } from '@app/common/components/ui/Text'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

const getBooksQuery = gql<typeof GetBookHomeDocument>(`query GetBookHome($take: Int) {
  books(take: $take) {
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
  }
}`)

const getRandomBookQuery = gql<typeof GetRandomBookDocument>(`query GetRandomBook {
  book {
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
  }
}`)

type Book = ExtractResultFieldTypeFor<typeof getBooksQuery, 'books'>

type HomePageProps = {
  book1: Book
  book2: Book
}

function makeBookCardLink(book: Book): JSX.Element {
  return (
    <Link href={`/books/${book.slug}`} key={book.id}>
      <a>
        <BookCover backgroundImageUrl={`${config.HOST_STATIC}/images/covers/${book.slug}.jpg`}>
          <VisuallyHidden>{book.title}</VisuallyHidden>
        </BookCover>
      </a>
    </Link>
  )
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
  const response = await localRequest().query({ query: getBooksQuery, variables: { take: 2 } })
  const books = response.data?.books
  const nonExistantBook = { title: 'a title', id: 'add-more-books' } as Book

  return {
    props: {
      book1: books?.[0] || nonExistantBook,
      book2: books?.[1] || nonExistantBook,
    },
  }
}

export default function Home({ book1, book2 }: HomePageProps): JSX.Element {
  const { data } = useGraphSWR(getRandomBookQuery, undefined, {
    revalidateOnFocus: false,
  })
  const book = data?.book
  const bookCardRandom = (book && makeBookCardLink(book)) || <div />
  const bookCardLatest = makeBookCardLink(book1)
  const bookCardLater = makeBookCardLink(book2)

  return (
    <Page meta={{ title: '' }}>
      <Container>
        <Grid
          css={{
            width: '100%',
            margin: 'auto',
            marginTop: '20px',
            gridTemplateRows: '1fr',
            gridTemplateColumns: '1fr',
            gridAutoFlow: 'row',
            justifyItems: 'center',
            alignItems: 'center',
            gap: '20px',
            textAlign: 'center',
            '@tablet': {
              width: '100%',
              margin: 'auto',
              marginTop: '250px',
              gridTemplateRows: '1fr 1fr',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridAutoFlow: 'column',
              justifyItems: 'center',
              alignItems: 'flex-start',
              gap: '20px',
              textAlign: 'center',
            },
            '@desktop': {
              width: '70%',
              margin: 'auto',
              marginTop: '250px',
              gridTemplateRows: '1fr 1fr',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridAutoFlow: 'column',
              justifyItems: 'center',
              alignItems: 'flex-start',
              gap: '20px',
              textAlign: 'center',
            },
          }}
        >
          <Box>{bookCardLatest}</Box>
          <Box>
            <Text as="h1">last read</Text>
          </Box>
          <Box>{bookCardLater}</Box>
          <Box>
            <Text as="h1">previously read</Text>
          </Box>
          <Box>{bookCardRandom}</Box>
          <Box>
            <Text as="h1">random read</Text>
          </Box>
        </Grid>
      </Container>
    </Page>
  )
}
