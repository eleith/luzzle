import { BookCoverFor } from '@app/common/components/books'
import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import { GetByTagDocument } from './_gql_/[slug]'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { ResultOf } from '@graphql-typed-document-node/core'
import Link from 'next/link'
import * as styles from './index.css'
import { useRouter } from 'next/router'

const getByTagQuery = gql<typeof GetByTagDocument>(
  `query GetByTag($take: Int, $after: String, $tag: String) {
  books(take: $take, after: $after, tag: $tag) {
    ...BookFullDetails
  }
}
`,
  bookFragment
)

type GetByTagQuery = ResultOf<typeof getByTagQuery>
type Book = NonNullable<GetByTagQuery['books']>[number]

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

export default function Books(): JSX.Element {
  const router = useRouter()
  const slug = router.query.slug as string
  const totalBooks: Book[] = []
  const { data, size, setSize } = useGraphSWRInfinite(
    (_, previousData: GetByTagQuery | null) => {
      const lastData = previousData?.books
      if (!lastData || lastData.length === TAKE) {
        const lastBook = lastData?.[TAKE - 1]
        return {
          gql: getByTagQuery,
          variables: lastBook
            ? { take: TAKE, after: lastBook.readOrder, tag: slug }
            : { take: TAKE, tag: slug },
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
  const isEnd = lastPage.length === 0 || lastPage.length < TAKE

  if (data) {
    const pages = data.reduce((total, query) => [...total, ...(query.books || [])], [] as Book[])
    totalBooks.push(...pages)
  }

  function loadMore(): void {
    setSize(size + 1)
  }

  const allBooks = totalBooks.map((book) => makeBookCardLink(book))

  return (
    <PageFull meta={{ title: 'books' }}>
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
