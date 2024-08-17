import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetFilmPiecesDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { useState } from 'react'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
import Film from 'next/link'
import PieceCard from '@app/common/components/pieces/PieceCard'

const getFilmsQuery = gql<typeof GetFilmPiecesDocument>(
	`query GetFilmPieces($take: Int, $page: Int, $type: String) {
  pieces(take: $take, page: $page, type: $type) {
    ...PieceFullDetails
  }
}
`,
	pieceFragment
)

type GetFilmsQuery = ResultOf<typeof getFilmsQuery>
type Film = NonNullable<GetFilmsQuery['pieces']>[number]

type FilmsProps = {
	films: Film[]
}

const TAKE = 50

export async function getStaticProps(): Promise<{ props: FilmsProps }> {
	const response = await staticClient.query({
		query: getFilmsQuery,
		variables: { take: TAKE, type: 'films' },
	})

	return {
		props: {
			films: response.data?.pieces || [],
		},
	}
}

export default function Films({ films }: FilmsProps): JSX.Element {
	const totalFilms: Film[] = []
	const [shouldFetch, setFetch] = useState(false)
	const { data, size, setSize } = useGraphSWRInfinite(
		(page, previousData: GetFilmsQuery | null) => {
			const lastData = previousData?.pieces || films
			if (shouldFetch && lastData.length === TAKE) {
				return {
					gql: getFilmsQuery,
					variables: {
						take: TAKE,
						page: page + 1,
						type: 'films',
					},
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

	const lastPage = data?.[data.length - 1]?.pieces || []
	const isEnd = size !== 1 && (lastPage.length === 0 || lastPage.length < TAKE)

	if (data) {
		const pages = data.reduce((total, query) => [...total, ...(query.pieces || [])], [] as Film[])
		totalFilms.push(...films, ...pages)
	} else {
		totalFilms.push(...films)
	}

	function loadMore(): void {
		if (size === 1) {
			setFetch(true)
		}
		setSize(size + 1)
	}

	const allFilms = totalFilms.map((game, i) => (
		<PieceCard
			id={game.id}
			slug={game.slug}
			media={game.media}
			title={game.title}
			type={'films'}
			loading={i <= 10 ? 'eager' : 'lazy'}
			key={i}
		/>
	))

	return (
		<PageFull meta={{ title: 'films' }}>
			<Box>
				<Box className={styles.filmsContainer}>{allFilms}</Box>
				{!isEnd && (
					<Box className={styles.filmsActions}>
						<Anchor onClick={loadMore}>get more films</Anchor>
					</Box>
				)}
			</Box>
		</PageFull>
	)
}
