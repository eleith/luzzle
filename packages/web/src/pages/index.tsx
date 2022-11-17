import PageFull from '@app/common/components/layout/PageFull'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetBookHomeDocument, GetSearchHomeDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import Link from 'next/link'
import {
  Box,
  Text,
  Anchor,
  Combobox,
  ComboboxItem,
  ComboboxItemLink,
  Divider,
} from '@luzzle/ui/components'
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

function makeLink(text: string, href: string) {
  return (
    <Link href={href} passHref>
      <Anchor hoverAction="animateUnderline">{text}</Anchor>
    </Link>
  )
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

  async function fuzzySearchBook(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const query = e.currentTarget.value
    if (query) {
      const data = await getSearchResults(query)
      setSearches(data)
    } else {
      setSearches([])
    }
  }

  const searchResults = searches.map((book) => (
    <Link key={book.slug} href={`/books/${book.slug}`} passHref>
      <ComboboxItemLink value={book.title}>
        <Box>
          <Text size="body">{book.title}</Text>
          {book.subtitle && <Text size="caption">{book.subtitle}</Text>}
          {book.author && <Text size="caption">{`${book.author} ${book.coauthors || ''}`}</Text>}
        </Box>
      </ComboboxItemLink>
    </Link>
  ))

  return (
    <PageFull meta={{ title: 'books' }} isHome>
      <Box className={styles.page}>
        <Box>
          <Text as="h1" size={'title'}>
            hello
          </Text>
          <br />
          <Text as="h2" size={'h1'}>
            this is an archive of {makeLink('books', '/books')} i&apos;ve read
          </Text>
          <br />
          <Text as="h3" size={'h1'}>
            the last two are {makeLink(book1.title, `/books/${book1.slug}`)} and{' '}
            {makeLink(book2.title, `/books/${book2.slug}`)}
          </Text>
          <br />
          <Divider />
          <br />
          <Text as="h3" size={'h1'}>
            search and discuss one with me
          </Text>
          <br />
          <Box>
            <Combobox
              state={{ sameWidth: true }}
              onChange={fuzzySearchBook}
              placeholder="ex: A Tale of Two Websites"
            >
              {searches.length ? searchResults : <ComboboxItem>no results</ComboboxItem>}
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
