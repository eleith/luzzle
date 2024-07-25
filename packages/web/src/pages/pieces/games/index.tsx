import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetGamePiecesDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { useState } from 'react'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
import Game from 'next/link'
import PieceCard from '@app/common/components/pieces/PieceCard'

const getGamesQuery = gql<typeof GetGamePiecesDocument>(
	`query GetGamePieces($take: Int, $page: Int, $type: String) {
  pieces(take: $take, page: $page, type: $type) {
    ...PieceFullDetails
  }
}
`,
	pieceFragment
)

type GetGamesQuery = ResultOf<typeof getGamesQuery>
type Game = NonNullable<GetGamesQuery['pieces']>[number]

type GamesProps = {
	games: Game[]
}

const TAKE = 50

export async function getStaticProps(): Promise<{ props: GamesProps }> {
	const response = await staticClient.query({
		query: getGamesQuery,
		variables: { take: TAKE, type: 'games' },
	})

	return {
		props: {
			games: response.data?.pieces || [],
		},
	}
}

export default function Games({ games }: GamesProps): JSX.Element {
	const totalGames: Game[] = []
	const [shouldFetch, setFetch] = useState(false)
	const { data, size, setSize } = useGraphSWRInfinite(
		(page, previousData: GetGamesQuery | null) => {
			const lastData = previousData?.pieces || games
			if (shouldFetch && lastData.length === TAKE) {
				return {
					gql: getGamesQuery,
					variables: {
						take: TAKE,
						page: page + 1,
						type: 'games',
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
		const pages = data.reduce((total, query) => [...total, ...(query.pieces || [])], [] as Game[])
		totalGames.push(...games, ...pages)
	} else {
		totalGames.push(...games)
	}

	function loadMore(): void {
		if (size === 1) {
			setFetch(true)
		}
		setSize(size + 1)
	}

	const allGames = totalGames.map((game, i) => (
		<PieceCard
			id={game.id}
			slug={game.slug}
			media={game.media}
			title={game.title}
			type={'games'}
			loading={i <= 10 ? 'eager' : 'lazy'}
			key={i}
		/>
	))

	return (
		<PageFull meta={{ title: 'games' }}>
			<Box>
				<Box className={styles.gamesContainer}>{allGames}</Box>
				{!isEnd && (
					<Box className={styles.gamesActions}>
						<Anchor onClick={loadMore}>get more games</Anchor>
					</Box>
				)}
			</Box>
		</PageFull>
	)
}
