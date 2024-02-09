import PageFull from '@app/common/components/layout/PageFull'
import gql from '@app/lib/graphql/tag'
import pieceFragment from '@app/common/graphql/piece/fragments/pieceFullDetails'
import { GetByTagDocument } from './_gql_/[slug]'
import { Box, Anchor } from '@luzzle/ui/components'
import useGraphSWRInfinite from '@app/common/hooks/useGraphSWRInfinite'
import { ResultOf } from '@graphql-typed-document-node/core'
import * as styles from './index.css'
import { useRouter } from 'next/router'
import PieceCard from '@app/common/components/pieces/PieceCard'

const getByTagQuery = gql<typeof GetByTagDocument>(
	`query GetByTag($take: Int, $page: Int, $tag: String) {
  pieces(take: $take, page: $page, tag: $tag) {
    ...PieceFullDetails
  }
}
`,
	pieceFragment
)

type GetByTagQuery = ResultOf<typeof getByTagQuery>
type Piece = NonNullable<GetByTagQuery['pieces']>[number]

const TAKE = 50

export default function Books(): JSX.Element {
	const router = useRouter()
	const slug = router.query.slug as string
	const totalPieces: Piece[] = []
	const { data, size, setSize } = useGraphSWRInfinite(
		(page, previousData: GetByTagQuery | null) => {
			const lastData = previousData?.pieces
			if (!lastData || lastData.length === TAKE) {
				const lastBook = lastData?.[TAKE - 1]
				return {
					gql: getByTagQuery,
					variables: lastBook
						? {
								take: TAKE,
								page: page + 1,
								tag: slug,
						  }
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

	const lastPage = data?.[data.length - 1]?.pieces || []
	const isEnd = lastPage.length === 0 || lastPage.length < TAKE

	if (data) {
		const pages = data.reduce((total, query) => [...total, ...(query.pieces || [])], [] as Piece[])
		totalPieces.push(...pages)
	}

	function loadMore(): void {
		setSize(size + 1)
	}

	const allBooks = totalPieces.map((piece, i) => PieceCard(piece, i))

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
