import Page from '@app/common/components/layout/Page'
import gql from '@app/lib/graphql/tag'
import { GetPieceSearchDocument } from './_gql_/search'
import { Box, Button, Input } from '@luzzle/ui/components'
import { useState, ChangeEvent } from 'react'
import { XCircle } from 'phosphor-react'
import gqlFetch from '@app/common/graphql/fetch'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { useRouter } from 'next/router'
import * as styles from './search.css'
import PieceCard from '@app/common/components/pieces/PieceCard'

const getPieceSearchQuery = gql<typeof GetPieceSearchDocument>(
	`query GetPieceSearch($query: String!) {
  search(query: $query) {
    __typename
    ... on QuerySearchSuccess {
      data {
        ...PieceFullDetails
      }
    }
  }
}`,
	pieceFragment
)

async function getSearchResults(query: string) {
	const data = await gqlFetch(getPieceSearchQuery, { query })
	return data.search?.__typename === 'QuerySearchSuccess' ? data.search.data : []
}

type PieceSearchResults = Awaited<ReturnType<typeof getSearchResults>>

export default function SearchPage(): JSX.Element {
	const [searches, setSearches] = useState<PieceSearchResults>([])
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

	const searchResults = searches.map((piece, i) => (
		<Box key={i} style={{ marginTop: '40px', width: '300px' }}>
			<PieceCard {...piece} />
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
					size="h1"
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
