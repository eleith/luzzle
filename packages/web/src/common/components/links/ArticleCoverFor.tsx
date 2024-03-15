import config from '@app/common/config'
import ArticleCover, { ArticleCoverProps } from './ArticleCover'

type Piece = {
	id: string
	slug: string
	title: string
	media?: string | null
}

const ArticleCoverSize = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE',
} as const

type ArticleCoverForProps = {
	hasMedia?: boolean
	piece: Piece
	size?: (typeof ArticleCoverSize)[keyof typeof ArticleCoverSize]
} & ArticleCoverProps

function getDimensions(size: (typeof ArticleCoverSize)[keyof typeof ArticleCoverSize]) {
	switch (size) {
		case ArticleCoverSize.SMALL:
			return {
				height: 150,
				width: 100,
				imgHeight: 45,
			}
		default:
			return {
				height: 600,
				width: 400,
				imgHeight: 150,
			}
	}
}

function getCoverUrl(piece: Piece, size = 125, type: 'webp' | 'avif' | 'jpg' = 'jpg'): string {
	const height = size <= 125 ? 125 : size <= 250 ? 250 : size <= 500 ? 500 : 1000
	return `${config.public.HOST_STATIC}/images/variants/links/${piece.media}.h${height}.${type}`
}

function ArticleCoverFor({
	piece,
	size = ArticleCoverSize.MEDIUM,
	hasMedia = false,
	...linkCoverProps
}: ArticleCoverForProps): JSX.Element {
	const dimensions = getDimensions(size)
	const coverUrl = {
		avif: getCoverUrl(piece, dimensions.imgHeight, 'avif'),
		jpg: getCoverUrl(piece, dimensions.imgHeight, 'jpg'),
	}

	const articleCoverProps: ArticleCoverProps = {
		...linkCoverProps,
		width: dimensions.width,
		height: dimensions.height,
		imageUrl: hasMedia ? coverUrl : undefined,
		imgHeight: hasMedia ? dimensions.imgHeight : undefined,
	}

	return <ArticleCover {...articleCoverProps} />
}

export default ArticleCoverFor
