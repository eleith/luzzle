import { BookCover, BookCoverFor } from '@app/common/components/books'
import PageFull from '@app/common/components/page/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import useGraphSWR from '@app/common/hooks/useGraphSWR'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeDocument, GetRandomBookDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import Link from 'next/link'
import { Box, Text, Anchor } from '@app/common/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as classNames from './index.css'
import { VisuallyHidden } from 'ariakit'

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
          y: 0,
        }}
        rotateInteract={{
          x: 0,
          y: -35,
        }}
      />
    )
  } else {
    return (
      <BookCover loading={true}>
        <VisuallyHidden>loading a book</VisuallyHidden>
      </BookCover>
    )
  }
}

function makeBookDateString(book?: Book): string {
  const month = book && typeof book.monthRead === 'number' ? book.monthRead : '?'
  const year = book && typeof book.yearRead === 'number' ? book.yearRead : '?'

  return `${month} / ${year}`
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
  const randomBook = data?.book || undefined

  return (
    <PageFull meta={{ title: 'books' }} isHome>
      <Box>
        <Box className={classNames.booksContainer}>
          <Box>
            {makeBookCardLink(book1)}
            <br />
            <Text as="h1" size={'medium'}>
              {makeBookDateString(book1)}
            </Text>
          </Box>
          <Box>
            {makeBookCardLink(book2)}
            <br />
            <Text as="h1" size={'medium'}>
              {makeBookDateString(book2)}
            </Text>
          </Box>
          <Box>
            {makeBookCardLink(randomBook)}
            <br />
            <Text as="h1" size={'medium'}>
              {makeBookDateString(randomBook)}
            </Text>
          </Box>
        </Box>
        <Box className={classNames.booksActions}>
          <Link href="/books" passHref>
            <Anchor hoverAction="animateUnderline">all books</Anchor>
          </Link>
        </Box>
      </Box>
    </PageFull>
  )
}

// https://nextjs.org/docs/advanced-features/output-file-tracing#caveats
export const config = {
  unstable_includeFiles: ['prisma/data/*'],
}
