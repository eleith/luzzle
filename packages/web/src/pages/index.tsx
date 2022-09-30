import { BookCover, BookCoverFor } from '@app/common/components/books'
import PageFull from '@app/common/components/layout/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import useGraphSWR from '@app/common/hooks/useGraphSWR'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeDocument, GetRandomBookDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import Link from 'next/link'
import { Box, Text, Anchor } from '@app/common/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
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
    __typename
    ... on QueryBookSuccess {
      data {
        ...BookFullDetails
      }
    }
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
  const randomBook = data?.book?.__typename === 'QueryBookSuccess' ? data.book.data : undefined

  const explore = (
    <Link href="/books" passHref>
      <Anchor hoverAction="animateUnderline">explore</Anchor>
    </Link>
  )

  return (
    <PageFull meta={{ title: 'books' }} isHome>
      <Box className={styles.page}>
        <Box>
          <Text as="h1" size={'title'}>
            hello
          </Text>
          <Text as="h2" size={'h1'}>
            this site is a collection of <i>things</i>. currently, those <i>things</i> are books
            <br />
            <br />
            feel free to {explore} and start a discussion on any of them
          </Text>
          <br />
          <br />
          <Text as="h3" size={'h1'}>
            here are the last two i read,
          </Text>
          <br />
          <Box className={styles.books}>
            {makeBookCardLink(book1)}
            {makeBookCardLink(book2)}
          </Box>
          <br />
          <Text as="h3" size={'h1'}>
            here is a random one,
          </Text>
          <br />
          <Box className={styles.books}>{makeBookCardLink(randomBook)}</Box>
        </Box>
      </Box>
    </PageFull>
  )
}

// https://nextjs.org/docs/advanced-features/output-file-tracing#caveats
export const config = {
  unstable_includeFiles: ['prisma/data/*'],
}
