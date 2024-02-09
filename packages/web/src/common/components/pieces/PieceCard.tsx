import { Anchor, Box } from '@luzzle/ui/components'
import Link from 'next/link'
import { CaretRight } from 'phosphor-react'
import { BookCoverFor } from '../books'
import ArticleCoverFor from '../links/ArticleCoverFor'
import * as styles from './PieceCard.css'

type Piece = {
	id: string
	title: string
	slug: string
	type: string
	media?: string | null
}

function makePieceCard(piece: Piece, index = 0): JSX.Element {
	if (piece.type === 'links') {
		return (
			<ArticleCoverFor
				asLink={true}
				piece={piece}
				size={'SMALL'}
				imgLoading={index < 10 ? 'eager' : 'lazy'}
			/>
		)
	} else {
		return (
			<BookCoverFor
				piece={piece}
				hasCover={!!piece.media}
				scale={0.5}
				rotateInteract={{ x: 0, y: -35 }}
				imgLoading={index < 10 ? 'eager' : 'lazy'}
			/>
		)
	}
}

function PieceCard(piece: Piece, index = 0): JSX.Element {
	return (
		<Link href={`/pieces/${piece.type}/${piece.slug}`} key={piece.id}>
			<Anchor className={styles.pieceCard}>
				<Box style={{ display: 'flex' }}>
					<Box style={{ flex: 1 }}>
						<Box style={{ display: 'flex' }}>
							{makePieceCard(piece, index)}
							<Box style={{ alignSelf: 'center', flex: 1 }}>
								<CaretRight size={24} style={{ margin: 'auto' }} />
							</Box>
						</Box>
					</Box>
					<Box style={{ flex: 1, alignSelf: 'center' }}>{piece.title}</Box>
				</Box>
			</Anchor>
		</Link>
	)
}

export default PieceCard
