import { Anchor, Box } from '@luzzle/ui/components'
import Link from 'next/link'
import { CaretRight } from 'phosphor-react'
import { useState } from 'react'
import { BookCoverFor } from '../books'
import ArticleCoverFor from '../links/ArticleCoverFor'
import * as styles from './PieceCard.css'

type Props = {
	id: string
	title: string
	slug: string
	type: string
	media?: string | null
	loading?: 'eager' | 'lazy'
}

function makePieceCard(props: Props, isActive = false): JSX.Element {
	if (props.type === 'links') {
		return (
			<ArticleCoverFor
				piece={props}
				hasMedia={!!props.media}
				size={'SMALL'}
				imgLoading={props.loading || 'lazy'}
			/>
		)
	} else {
		return (
			<BookCoverFor
				piece={props}
				hasCover={!!props.media}
				scale={0.5}
				rotateInteract={{ x: 0, y: -35 }}
				isActive={isActive}
				imgLoading={props.loading || 'lazy'}
			/>
		)
	}
}

function PieceCard(props: Props): JSX.Element {
	const [isActive, setActive] = useState(false)
	const href = `/pieces/${props.type}/${props.slug}`

	return (
		<Link href={href} key={props.id}>
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
							{makePieceCard(props, isActive)}
							<Box style={{ alignSelf: 'center', flex: 1 }}>
								<CaretRight size={24} style={{ margin: 'auto' }} />
							</Box>
						</Box>
					</Box>
					<Box style={{ flex: 1, alignSelf: 'center' }}>{props.title}</Box>
				</Box>
			</Anchor>
		</Link>
	)
}

export default PieceCard
