import config from '@app/common/config'
import FilmCover, { FilmCoverProps } from './FilmCover'

type Piece = {
	id: string
	slug: string
	title: string
	media?: string | null
}

const FilmCoverSize = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE',
} as const

type FilmCoverForProps = {
	hasMedia?: boolean
	piece: Piece
	size?: (typeof FilmCoverSize)[keyof typeof FilmCoverSize]
} & FilmCoverProps

function getDimensions(size: (typeof FilmCoverSize)[keyof typeof FilmCoverSize]) {
	switch (size) {
		case FilmCoverSize.SMALL:
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
	return `${config.public.HOST_STATIC}/images/variants/films/${piece.media}.w${width}.${type}`
}

function FilmCoverFor({
	piece,
	size = FilmCoverSize.MEDIUM,
	hasMedia = false,
	...filmProps
}: FilmCoverForProps): JSX.Element {
	const dimensions = getDimensions(size)
	const coverUrl = {
		avif: getCoverUrl(piece, dimensions.imgHeight, 'avif'),
		jpg: getCoverUrl(piece, dimensions.imgHeight, 'jpg'),
	}

	const filmCoverProps: FilmCoverProps = {
		...filmProps,
		width: dimensions.width,
		height: dimensions.height,
		imageUrl: hasMedia ? coverUrl : undefined,
		imgHeight: hasMedia ? dimensions.imgHeight : undefined,
	}

	return <FilmCover {...filmCoverProps} />
}

export default FilmCoverFor
