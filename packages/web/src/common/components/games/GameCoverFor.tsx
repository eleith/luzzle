import config from '@app/common/config'
import GameCover, { GameCoverProps } from './GameCover'

type Piece = {
	id: string
	slug: string
	title: string
	media?: string | null
}

const GameCoverSize = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE',
} as const

type GameCoverForProps = {
	hasMedia?: boolean
	piece: Piece
	size?: (typeof GameCoverSize)[keyof typeof GameCoverSize]
} & GameCoverProps

function getDimensions(size: (typeof GameCoverSize)[keyof typeof GameCoverSize]) {
	switch (size) {
		case GameCoverSize.SMALL:
			return {
				height: 150,
				width: 100,
				imgHeight: 45,
			}
		default:
			return {
				height: 500,
				width: 400,
				imgHeight: 150,
			}
	}
}

function getCoverUrl(piece: Piece, size = 125, type: 'webp' | 'avif' | 'jpg' = 'jpg'): string {
	const width = size <= 125 ? 125 : size <= 250 ? 250 : size <= 500 ? 500 : 1000
	return `${config.public.HOST_STATIC}/images/variants/games/${piece.media}.w${width}.${type}`
}

function GameCoverFor({
	piece,
	size = GameCoverSize.MEDIUM,
	hasMedia = false,
	...gameProps
}: GameCoverForProps): JSX.Element {
	const dimensions = getDimensions(size)
	const coverUrl = {
		avif: getCoverUrl(piece, dimensions.imgHeight, 'avif'),
		jpg: getCoverUrl(piece, dimensions.imgHeight, 'jpg'),
	}

	const gameCoverProps: GameCoverProps = {
		...gameProps,
		width: dimensions.width,
		height: dimensions.height,
		imageUrl: hasMedia ? coverUrl : undefined,
		imgHeight: hasMedia ? dimensions.imgHeight : undefined,
	}

	return <GameCover {...gameCoverProps} />
}

export default GameCoverFor
