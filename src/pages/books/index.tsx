import { BookCoverFor } from '@app/common/components/books'
import Page from '@app/common/components/page'
import gql from '@app/lib/graphql/tag'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetBooksDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box } from '@app/common/components/ui/Box'
import { Container } from '@app/common/components/ui/Container'
import { Grid, Text } from '@app/common/components/ui'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { MouseEvent, MouseEventHandler, useState } from 'react'
import { Flex } from '@app/common/components/ui/Flex'
import { ResultOf } from '@graphql-typed-document-node/core'
import { Cross1Icon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { Button } from '@app/common/components/ui/Button'

const getBooksQuery = gql<typeof GetBooksDocument>(
  `query GetBooks($take: Int, $after: String) {
  books(take: $take, after: $after) {
    ...BookFullDetails
  }
}
`,
  bookFragment
)

type GetBooksQuery = ResultOf<typeof getBooksQuery>
type Book = NonNullable<GetBooksQuery['books']>[number]

type BooksProps = {
  books: Book[]
}

const TAKE = 50

function makeBookCardLink(
  book: Book,
  onClick: MouseEventHandler,
  highlighted?: Book | null
): JSX.Element {
  const isSelected = highlighted?.id === book.id
  return (
    <Box
      key={book.id}
      onClick={onClick}
      data-id={book.id}
      css={{
        padding: '10px',
        cursor: 'pointer',
      }}
    >
      <BookCoverFor
        book={book}
        hasCover={!!book.coverWidth}
        scale={0.5}
        rotate={{ x: 0, y: isSelected ? -35 : 0 }}
      />
    </Box>
  )
}

function makeHighlightedBookPanel(book: Book, onClose: MouseEventHandler): JSX.Element {
  return (
    <Box
      css={{
        height: '100%',
        width: '100%',
        position: 'fixed',
        background: 'white',
        borderLeft: 'solid black 1px',
        top: '0px',
        right: '0px',
        padding: '15px',
        '@tablet': {
          width: '300px',
        },
        '@desktop': {
          width: '300px',
        },
      }}
    >
      <Flex css={{ justifyContent: 'flex-end', cursor: 'pointer' }}>
        <Cross1Icon onClick={onClose} />
      </Flex>
      <Box css={{ marginTop: '25px' }}>
        <BookCoverFor book={book} hasCover={!!book.coverWidth} scale={1} />
      </Box>
      <Box css={{ marginTop: '25px' }}>
        <Text as="h1">
          <Link href={`/books/${book.slug}`}>
            <a target="_blank">{book.title}</a>
          </Link>
        </Text>
        {book.subtitle && (
          <Text>
            <br />
            {book.subtitle}
          </Text>
        )}
        <Text>
          by {book.author} {book.coauthors}
        </Text>
        <br />
        <Text>isbn: {book.isbn}</Text>
        <br />
        <Text>published: {book.yearFirstPublished}</Text>
        <br />
        <Text>pages: {book.pages}</Text>
      </Box>
    </Box>
  )
}

export async function getStaticProps(): Promise<{ props: BooksProps }> {
  const response = await staticClient.query({ query: getBooksQuery, variables: { take: TAKE } })
  const books = response.data?.books

  return {
    props: {
      books: books || [],
    },
  }
}

export default function Books({ books }: BooksProps): JSX.Element {
  // const totalBooks: Book[] = []
  const [shouldFetch, setFetch] = useState(false)
  const [highlighted, setHighlightFor] = useState<Book | null>(null)
  const { data, size, setSize } = useGraphSWRInfinite(
    (_, previousData: GetBooksQuery | null) => {
      const lastData = previousData?.books || books
      if (shouldFetch && lastData.length === TAKE) {
        const lastBook = lastData?.[TAKE - 1]
        return {
          gql: getBooksQuery,
          variables: { take: TAKE, after: lastBook.readOrder },
        }
      } else {
        return null
      }
    },
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    }
  )

  // until react-virtual supports window in v3
  const totalBooks: Book[] = []

  if (data) {
    // const pages = data.reduce((total, query) => [...total, ...(query.books || [])], [] as Book[])
    const pages = data[data.length - 1].books || []
    totalBooks.push(...pages)
    window.scrollTo({ top: 0 })
  } else {
    totalBooks.push(...books)
  }

  function loadMore(): void {
    if (size === 1) {
      setFetch(true)
    }
    setSize(size + 1)
  }

  async function loadDetails(event: MouseEvent<HTMLElement>): Promise<void> {
    const node = event.currentTarget
    const id = node.dataset.id

    if (id) {
      const book = totalBooks.find((book) => book.id === id)
      if (book) {
        setHighlightFor(book)
      }
    }
  }

  async function closeDetails(): Promise<void> {
    setHighlightFor(null)
  }

  const allBooks = totalBooks.map((book) => makeBookCardLink(book, loadDetails, highlighted))

  return (
    <Page meta={{ title: '' }}>
      <Container css={{ paddingBottom: '20px' }}>
        <Grid
          justify="center"
          gap="4"
          css={{
            gridTemplateColumns: 'repeat(auto-fill, 140px)',
            alignItems: 'center',
            width: '100%',
            margin: 'auto',
            marginTop: '20px',
            marginBottom: '20px',
            '&::last-child': {
              marginRight: 'auto',
            },
            '@tablet': {
              paddingRight: highlighted ? '300px' : '0px',
            },
            '@desktop': {
              paddingRight: highlighted ? '300px' : '0px',
            },
          }}
        >
          {allBooks}
        </Grid>
        {totalBooks.length === TAKE && (
          <Box css={{ textAlign: 'center' }}>
            <Button size={3} onClick={loadMore}>
              get more books
            </Button>
          </Box>
        )}
        {highlighted && makeHighlightedBookPanel(highlighted, closeDetails)}
      </Container>
    </Page>
  )
}
