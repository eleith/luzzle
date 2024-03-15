import config from '@app/common/config'
import BookCover, { BookCoverProps } from './BookCover'
import { VisuallyHidden } from 'ariakit'
import { createHash } from 'crypto'
import { Box } from '@luzzle/ui/components'

const BookCoverSize = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE',
} as const

type Piece = {
	slug: string
	title: string
	id: string
	media?: string | null
}

type BookCoverForProps = {
	piece: Piece
	hasCover?: boolean
	size?: typeof BookCoverSize
	scale?: number
	pages?: number | null
	reference?: React.RefObject<HTMLElement>
} & Omit<BookCoverProps, 'children' | 'backgroundImageUrl'>

const BookColors = ['#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fe8019']

const sizes = {
	SMALL: {
		width: 200 * 0.9,
		height: 300 * 0.9,
		thickness: 50 * 0.9,
	},
	MEDIUM: {
		width: 200,
		height: 300,
		thickness: 50,
	},
	LARGE: {
		width: 200 * 1.1,
		height: 300 * 1.1,
		thickness: 50 * 1.1,
	},
}

function getColor(slug: string): (typeof BookColors)[number] {
	const numColors = BookColors.length
	const hex = createHash('sha256').update(slug).digest('hex')
	const random = parseInt(hex, 16) % numColors

	return BookColors[random]
}

function getSize(pages?: number | null, scale = 1): (typeof sizes)[keyof typeof BookCoverSize] {
	let size = sizes.SMALL
	if (pages) {
		if (pages >= 700) {
			size = sizes.LARGE
		} else if (pages && pages >= 320) {
			size = sizes.MEDIUM
		}
	}
	return {
		width: size.width * scale,
		height: size.height * scale,
		thickness: size.thickness * scale,
	}
}

function getCoverUrl(piece: Piece, size = 125, type: 'webp' | 'avif' | 'jpg' = 'jpg'): string {
	const width = size <= 125 ? 125 : size <= 250 ? 250 : size <= 500 ? 500 : 1000
	return `${config.public.HOST_STATIC}/images/variants/books/${piece.media}.w${width}.${type}`
}

function BookCoverFor({
	piece,
	hasCover = false,
	pages = 100,
	scale = 1,
	...coverProps
}: BookCoverForProps): JSX.Element {
	const size = getSize(pages, scale)
	const coverUrl = {
		jpg: getCoverUrl(piece, size.width, 'jpg'),
		avif: getCoverUrl(piece, size.width, 'avif'),
	}
	const color = getColor(piece.slug)
	const bookCoverProps = {
		...size,
		backgroundColor: color,
		...coverProps,
		backgroundImageUrl: hasCover ? coverUrl : undefined,
	} as BookCoverProps

	return (
		<BookCover {...bookCoverProps}>
			<Box>
				<span>{piece.title}</span>
				<VisuallyHidden>{piece.title}</VisuallyHidden>
			</Box>
		</BookCover>
	)
}

export default BookCoverFor
export { getColor, getSize, getCoverUrl }
