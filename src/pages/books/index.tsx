import BookCover from '@app/common/components/books'
import Page from '@app/common/components/page'
import gql from '@app/graphql/tag'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetBooksDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import config from '@app/common/config'
import { Box } from '@app/common/components/ui/Box'
import { Container } from '@app/common/components/ui/Container'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Text } from '@app/common/components/ui'
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

function makeBookCardLink(book: Book, onClick: MouseEventHandler): JSX.Element {
  return (
    <Box key={book.id} onClick={onClick} data-id={book.id}>
      <BookCover
        backgroundImageUrl={`${config.HOST_STATIC}/images/covers/${book.slug}.jpg`}
        width={100}
        height={150}
        thickness={20}
      >
        <VisuallyHidden>{book.title}</VisuallyHidden>
      </BookCover>
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
          width: '250px',
        },
        '@desktop': {
          width: '250px',
        },
      }}
    >
      <Flex css={{ justifyContent: 'flex-end' }}>
        <Cross1Icon onClick={onClose} />
      </Flex>
      <Box css={{ marginTop: '25px' }}>
        <BookCover backgroundImageUrl={`${config.HOST_STATIC}/images/covers/${book.slug}.jpg`}>
          <VisuallyHidden>{book.title}</VisuallyHidden>
        </BookCover>
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
        <Text>published: {book.year_first_published}</Text>
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

export default function Home({ books }: BooksProps): JSX.Element {
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
          variables: { take: TAKE, after: lastBook.read_order },
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

  const allBooks = totalBooks.map((book) => makeBookCardLink(book, loadDetails))

  return (
    <Page meta={{ title: '' }}>
      <Container css={{ paddingBottom: '20px' }}>
        <Flex
          wrap="wrap"
          justify="start"
          gap="4"
          css={{
            width: '100%',
            margin: 'auto',
            marginTop: '20px',
            marginBottom: '20px',
            paddingLeft: '20px',
            '@tablet': {
              paddingRight: highlighted ? '250px' : '0px',
            },
            '@desktop': {
              paddingRight: highlighted ? '250px' : '0px',
            },
          }}
        >
          {allBooks}
        </Flex>
        {totalBooks.length === TAKE && (
          <Box css={{ textAlign: 'center' }}>
            <Button onClick={loadMore}>get more books</Button>
          </Box>
        )}
        {highlighted && makeHighlightedBookPanel(highlighted, closeDetails)}
      </Container>
    </Page>
  )
}
