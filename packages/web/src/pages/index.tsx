import PageFull from '@app/common/components/layout/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeDocument, GetSearchHomeDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import Link from 'next/link'
import { Box, Text, Anchor, Combobox, ComboboxItem, Divider } from '@app/common/ui/components'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
import gqlFetch from '@app/common/graphql/fetch'
import { ChangeEvent, useState } from 'react'

const getSearchQuery = gql<typeof GetSearchHomeDocument>(
  `query GetSearchHome($query: String!) {
  search(query: $query) {
    __typename
    ... on QuerySearchSuccess {
      data {
        ...BookFullDetails
      }
    }
  }
}`,
  bookFragment
)

const getBooksQuery = gql<typeof GetBookHomeDocument>(
  `query GetBookHome($take: Int) {
  books(take: $take) {
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

async function getSearchResults(query: string): Promise<Book[]> {
  const data = await gqlFetch(getSearchQuery, { query })
  return data.search?.__typename === 'QuerySearchSuccess' ? data.search.data : []
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
  const [searches, setSearches] = useState<Book[]>([])

  const explore = (
    <Link href="/books" passHref>
      <Anchor hoverAction="animateUnderline">books</Anchor>
    </Link>
  )

  const book1Link = (
    <Link href={`/books/${book1.slug}`} passHref>
      <Anchor hoverAction="animateUnderline">{book1.title}</Anchor>
    </Link>
  )

  const book2Link = (
    <Link href={`/books/${book2.slug}`} passHref>
      <Anchor hoverAction="animateUnderline">{book2.title}</Anchor>
    </Link>
  )

  async function onChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const query = e.currentTarget.value
    if (query) {
      const data = await getSearchResults(query)
      setSearches(data)
    } else {
      setSearches([])
    }
  }

  const searchResults = searches.length ? (
    searches.map((book) => (
      <Link key={book.slug} href={`/books/${book.slug}`}>
        <ComboboxItem value={book.title} hideOnClick focusOnHover>
          {book.title}
        </ComboboxItem>
      </Link>
    ))
  ) : (
    <ComboboxItem>no results</ComboboxItem>
  )

  return (
    <PageFull meta={{ title: 'books' }} isHome>
      <Box className={styles.page}>
        <Box>
          <Text as="h1" size={'title'}>
            hello
          </Text>
          <br />
          <Text as="h2" size={'h1'}>
            this is an archive of {explore} i&apos;ve read
          </Text>
          <br />
          <Text as="h3" size={'h1'}>
            my last two were {book1Link} and {book2Link}
          </Text>
          <br />
          <Divider />
          <br />
          <Text as="h2" size={'h1'}>
            search and start a discussion on one
          </Text>
          <br />
          <Box>
            <Combobox
              state={{ sameWidth: true }}
              onChange={onChange}
              placeholder="ex: A Portrait of the Human as a Young Person"
            >
              {searchResults}
            </Combobox>
          </Box>
        </Box>
      </Box>
    </PageFull>
  )
}

// https://nextjs.org/docs/advanced-features/output-file-tracing#caveats
export const config = {
  unstable_includeFiles: ['prisma/data/*'],
}
