import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetPiecesDocument } from './_gql_/index'
import staticClient from '@app/common/graphql/staticClient'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { useState } from 'react'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
import PieceCard from '@app/common/components/pieces/PieceCard'

const getPiecesQuery = gql<typeof GetPiecesDocument>(
	`query GetPieces($take: Int, $page: Int) {
  pieces(take: $take, page: $page) {
    ...PieceFullDetails
  }
}
`,
	pieceFragment
)

type GetPiecesQuery = ResultOf<typeof getPiecesQuery>
type Piece = NonNullable<GetPiecesQuery['pieces']>[number]

type PiecesProps = {
	pieces: Piece[]
}

const TAKE = 50

export async function getStaticProps(): Promise<{ props: PiecesProps }> {
	const response = await staticClient.query({ query: getPiecesQuery, variables: { take: TAKE } })

	return {
		props: {
			pieces: response.data?.pieces || [],
		},
	}
}

export default function Pieces({ pieces }: PiecesProps): JSX.Element {
	const totalPieces: Piece[] = []
	const [shouldFetch, setFetch] = useState(false)
	const { data, size, setSize } = useGraphSWRInfinite(
		(page, previousData: GetPiecesQuery | null) => {
			const lastData = previousData?.pieces || pieces
			if (shouldFetch && lastData.length === TAKE) {
				return {
					gql: getPiecesQuery,
					variables: {
						take: TAKE,
						page: page + 1,
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
		const pages = data.reduce((total, query) => [...total, ...(query.pieces || [])], [] as Piece[])
		totalPieces.push(...pieces, ...pages)
	} else {
		totalPieces.push(...pieces)
	}

	function loadMore(): void {
		if (size === 1) {
			setFetch(true)
		}
		setSize(size + 1)
	}

	const allPieces = totalPieces.map((piece, i) => (
		<PieceCard {...piece} key={i} loading={i <= 10 ? 'eager' : 'lazy'} />
	))

	return (
		<PageFull meta={{ title: 'pieces' }}>
			<Box>
				<Box className={styles.piecesContainer}>{allPieces}</Box>
				{!isEnd && (
					<Box className={styles.piecesActions}>
						<Anchor onClick={loadMore}>get more pieces</Anchor>
					</Box>
				)}
			</Box>
		</PageFull>
	)
}
