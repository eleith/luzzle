import { Anchor, Box } from '@luzzle/ui/components'
import Link from 'next/link'
import { CaretRight } from 'phosphor-react'
import { useState } from 'react'
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

function makePieceCard(piece: Piece, index = 0, isActive = false): JSX.Element {
	if (piece.type === 'links') {
		return (
			<ArticleCoverFor
				piece={piece}
				hasMedia={!!piece.media}
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
				isActive={isActive}
				imgLoading={index < 10 ? 'eager' : 'lazy'}
			/>
		)
	}
}

function PieceCard(piece: Piece, index = 0): JSX.Element {
	const [isActive, setActive] = useState(false)
	const href = `/pieces/${piece.type}/${piece.slug}`

	return (
		<Link href={href} key={piece.id}>
			<Anchor
				href={href}
				className={styles.pieceCard}
				onMouseOver={() => setActive(true)}
				onMouseLeave={() => setActive(false)}
				onTouchStart={() => setActive(true)}
				onTouchEnd={() => setActive(false)}
				onFocus={() => setActive(true)}
				onBlur={() => setActive(false)}
			>
				<Box style={{ display: 'flex' }}>
					<Box style={{ flex: 1 }}>
						<Box style={{ display: 'flex' }}>
							{makePieceCard(piece, index, isActive)}
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
