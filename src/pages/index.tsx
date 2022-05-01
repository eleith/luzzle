import { BookCover, BookCoverFor } from '@app/common/components/books'
import Page from '@app/common/components/page'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import useGraphSWR from '@app/common/hooks/useGraphSWR'
import gql from '@app/graphql/tag'
import { GetBookHomeDocument, GetRandomBookDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import Link from 'next/link'
import { Box } from '@app/common/components/ui/Box'
import { Container } from '@app/common/components/ui/Container'
import { Grid } from '@app/common/components/ui/Grid'
import { Text } from '@app/common/components/ui/Text'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { ResultOf } from '@graphql-typed-document-node/core'
import { Button } from '@app/common/components/ui/Button'

const getBooksQuery = gql<typeof GetBookHomeDocument>(
  `query GetBookHome($take: Int) {
  books(take: $take) {
    ...BookFullDetails
  }
}`,
  bookFragment
)

const getRandomBookQuery = gql<typeof GetRandomBookDocument>(
  `query GetRandomBook {
  book {
    ...BookFullDetails
  }
}`,
  bookFragment
)

type Book = NonNullable<ResultOf<typeof getBooksQuery>['books']>[number]

type HomePageProps = {
  book1: Book
  book2: Book
}

function makeBookCardLink(book?: Book): JSX.Element {
  if (book) {
    return (
      <BookCoverFor
        book={book}
        asLink
        hasCover={!!book.coverWidth}
        rotate={{
          x: 0,
          y: -35,
        }}
        rotateInteract={{
          x: 0,
          y: 0,
        }}
      />
    )
  } else {
    return (
      <BookCover>
        <VisuallyHidden>loading a book</VisuallyHidden>
      </BookCover>
    )
  }
}

export async function getStaticProps(): Promise<{ props: HomePageProps }> {
  const response = await staticClient.query({ query: getBooksQuery, variables: { take: 2 } })
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
  const bookCardRandom = book ? makeBookCardLink(book) : makeBookCardLink()
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
            gridTemplateColumns: '1fr',
            gridAutoFlow: 'row',
            justifyItems: 'center',
            alignItems: 'flex-end',
            gap: '20px',
            textAlign: 'center',
            '@tablet': {
              width: '100%',
              margin: 'auto',
              marginTop: '250px',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridAutoFlow: 'column',
              gap: '20px',
              textAlign: 'center',
            },
            '@desktop': {
              width: '70%',
              margin: 'auto',
              marginTop: '250px',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridAutoFlow: 'column',
              gap: '20px',
              textAlign: 'center',
            },
          }}
        >
          <Box>
            {bookCardLatest}
            <Text as="h1" css={{ paddingTop: '20px' }}>
              last read
            </Text>
          </Box>
          <Box>
            {bookCardLater}
            <Text as="h1" css={{ paddingTop: '20px' }}>
              previously read
            </Text>
          </Box>
          <Box>
            {bookCardRandom}
            <Text as="h1" css={{ paddingTop: '20px' }}>
              random read
            </Text>
          </Box>
        </Grid>
        <Box css={{ textAlign: 'center', marginTop: '40px' }}>
          <Link href="/books">
            <a>
              <Button size={3}>all reads</Button>
            </a>
          </Link>
        </Box>
      </Container>
    </Page>
  )
}
