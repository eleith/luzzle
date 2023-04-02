import Page from '@app/common/components/layout/Page'
import bookFragment from '@app/common/graphql/book/fragments/bookFullDetails'
import gql from '@app/lib/graphql/tag'
import { GetSearchPageBannerDocument } from './_gql_/search'
import Link from 'next/link'
import { Box, Text, Anchor, Button, Input } from '@luzzle/ui/components'
import { useState, ChangeEvent } from 'react'
import { XCircle } from 'phosphor-react'
import gqlFetch from '@app/common/graphql/fetch'
import { BookFullDetailsFragment as BookSearchResult } from '@app/common/graphql/book/fragments/_gql_/bookFullDetails'
import { useRouter } from 'next/router'
import * as styles from './search.css'

const getSearchQuery = gql<typeof GetSearchPageBannerDocument>(
  `query GetSearchPageBanner($query: String!) {
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

async function getSearchResults(query: string): Promise<BookSearchResult[]> {
  const data = await gqlFetch(getSearchQuery, { query })
  return data.search?.__typename === 'QuerySearchSuccess' ? data.search.data : []
}

export default function SearchPage(): JSX.Element {
  const [searches, setSearches] = useState<BookSearchResult[]>([])
  const router = useRouter()

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
    <Box key={book.slug} style={{ paddingBottom: '20px' }}>
      <Link href={`/books/${book.slug}`} passHref>
        <Anchor hoverAction="animateUnderline">
          <Text size="h2">{book.title}</Text>
        </Anchor>
      </Link>
      <Box>
        {book.subtitle && <Text size="caption">{book.subtitle}</Text>}
        {book.author && <Text size="caption">{`by ${book.author} ${book.coauthors || ''}`}</Text>}
      </Box>
    </Box>
  ))

  const leave = () => {
    if (window.history.state.options._shouldResolveHref) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const searchBox = (
    <Box>
      <Box className={styles.search}>
        <Input
          type="search"
          name="search"
          autoComplete="off"
          onChange={fuzzySearchBook}
          placeholder="title, author or keyword"
          description=""
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              leave()
            }
          }}
          className={styles.searchInput}
        />
        <Button className={styles.searchButton} minimal onClick={leave}>
          <XCircle size={25} />
        </Button>
      </Box>
      <Box className={styles.searchResults}>{searches.length ? searchResults : <Box>...</Box>}</Box>
    </Box>
  )

  return <Page meta={{ title: 'search' }}>{searchBox}</Page>
}
