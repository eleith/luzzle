import { BookCoverFor } from '@app/common/components/books'
import PageFull from '@app/common/components/page/PageFull'
import gql from '@app/lib/graphql/tag'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetBooksDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Anchor } from '@app/common/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { useState } from 'react'
import { ResultOf } from '@graphql-typed-document-node/core'
import Link from 'next/link'
import * as styles from './index.css'

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

function makeBookCardLink(book: Book): JSX.Element {
  return (
    <Link href={`/books/${book.slug}`} key={book.id}>
      <a target="_blank">
        <Box>
          <BookCoverFor
            book={book}
            hasCover={!!book.coverWidth}
            scale={0.5}
            rotateInteract={{ x: 0, y: -35 }}
          />
        </Box>
      </a>
    </Link>
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
  const totalBooks: Book[] = []
  const [shouldFetch, setFetch] = useState(false)
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

  // large tables will perform poorly
  // consider react-virtual when window support lands in v3

  const lastPage = data?.[data.length - 1]?.books || []
  const isEnd = size !== 1 && (lastPage.length === 0 || lastPage.length < TAKE)

  if (data) {
    const pages = data.reduce((total, query) => [...total, ...(query.books || [])], [] as Book[])
    totalBooks.push(...books, ...pages)
  } else {
    totalBooks.push(...books)
  }

  function loadMore(): void {
    if (size === 1) {
      setFetch(true)
    }
    setSize(size + 1)
  }

  const allBooks = totalBooks.map((book) => makeBookCardLink(book))

  return (
    <PageFull meta={{ title: '' }}>
      <Box>
        <Box className={styles.booksContainer}>{allBooks}</Box>
        {!isEnd && (
          <Box className={styles.booksActions}>
            <Anchor onClick={loadMore}>get more books</Anchor>
          </Box>
        )}
      </Box>
    </PageFull>
  )
}
