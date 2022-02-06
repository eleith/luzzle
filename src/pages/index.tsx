import BookCover from '@app/common/components/books'
import Page from '@app/common/components/page'
import useGraphSWR from '@app/common/hooks/useGraphSWR'
import { gql } from '@app/gql'
import localRequest from '@app/lib/graphql/localRequest'
import { ExtractResultFieldTypeFor } from '@app/lib/graphql/types'
import Link from 'next/link'
import { Box, Container, Grid, Spinner, Heading, Text } from 'theme-ui'
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
    year_read
    month_read
  }
}`)

const getRandomBookQuery = gql(`query getRandomBook {
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

type Book = ExtractResultFieldTypeFor<typeof getTwoBooksQuery, 'books'>

type HomePageProps = {
  book1: Book
  book2: Book
}

function makeBookCardLink(book: Book): JSX.Element {
  return (
    <Link href={`/books/${book.slug}`} key={book.id}>
      <a>
        <BookCover backgroundImageUrl={`/images/covers/${book.slug}.jpg`}>
          <VisuallyHidden>{book.title}</VisuallyHidden>
        </BookCover>
      </a>
    </Link>
  )
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
  const response = await localRequest().query({ query: getTwoBooksQuery })
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
  const book = data?.book as Book | null
  const bookCardRandom = (book && makeBookCardLink(book)) || <Spinner />
  const bookCardLatest = makeBookCardLink(book1)
  const bookCardLater = makeBookCardLink(book2)

  return (
    <Page meta={{ title: '' }}>
      <Container>
        <Grid
          sx={{
            width: ['100%', '100%', '70%'],
            margin: 'auto',
            marginTop: '250px',
            gridTemplateRows: ['1fr 1fr 1fr', '1fr 1fr', '1fr 1fr'],
            gridTemplateColumns: ['1fr 1fr', '1fr 1fr 1fr', '1fr 1fr 1fr'],
            gridAutoFlow: ['row', 'column', 'column'],
            justifyItems: 'center',
            alignItems: ['center', 'flex-start', 'flex-start'],
            gap: '20px',
            textAlign: 'center',
          }}
        >
          <Box>{bookCardLatest}</Box>
          <Box>
            <Text as="h1" sx={{ fontSize: 0 }}>
              last read
            </Text>
          </Box>
          <Box sx={{ gridColumnStart: [2, 'auto', 'auto'] }}>{bookCardLater}</Box>
          <Box sx={{ gridColumnStart: [1, 'auto', 'auto'], gridRowStart: [2, 'auto', 'auto'] }}>
            <Text as="h1" sx={{ fontSize: 0 }}>
              previously read
            </Text>
          </Box>
          <Box>{bookCardRandom}</Box>
          <Box>
            <Text as="h1" sx={{ fontSize: 0 }}>
              random read
            </Text>
          </Box>
        </Grid>
      </Container>
    </Page>
  )
}
