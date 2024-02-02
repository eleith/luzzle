import { PieceSelectable } from '@luzzle/kysely'
import { createHash } from 'crypto'
import { html, imageAsBase64 } from './template'

const BookCoverSize = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE',
} as const

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

/* eslint-disable @next/next/no-img-element */
function bookToHtml(book: PieceSelectable<'books'>) {
	const color = getColor(book.slug)
	const size = getSize(book.pages, 1.5)
	const url = imageAsBase64(`./public/images/variants/books/covers/${book.slug}.w500.jpg`)

	const cover = url ? (
		<img
			alt={''}
			src={url}
			style={{
				width: size.width,
				height: size.height,
				objectFit: 'cover',
				boxShadow: '-11px 11px 15px #000',
				alignSelf: 'center',
			}}
		/>
	) : (
		<div
			style={{
				backgroundColor: color,
				width: size.width,
				height: size.height,
				objectFit: 'cover',
				boxShadow: '-11px 11px 15px #000',
				alignSelf: 'center',
			}}
		/>
	)

	return html(cover, { title: book.title, subtitle: book.subtitle ?? '' })
}

export { bookToHtml }
