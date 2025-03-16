import { createHash } from 'crypto'
import { type WebPieces } from '../../types'
import { imageToBase64 } from '$lib/openGraph/image'

const BookColors = ['#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fe8019']

function getColor(slug: string): (typeof BookColors)[number] {
	const numColors = BookColors.length
	const hex = createHash('sha256').update(slug).digest('hex')
	const random = parseInt(hex, 16) % numColors

	return BookColors[random]
}

async function html(piece: WebPieces, media?: Buffer) {
	const color = getColor(piece.slug)
	const width = 300
	const height = 450
	const metadata = JSON.parse(piece.json_metadata)
	const firstLine = piece.title
	const secondLine = metadata.subtitle || `by ${metadata.author}`

	let icon = `<div style="background-color: ${color}; width: ${width}px; height: ${height}px; object-fit: cover; box-shadow: -11px 11px 15px #000; align-self: center; display: flex;" />`

	if (media) {
		const base64 = await imageToBase64(media)
		icon = `<img alt="" src="${base64}" style="width: ${width}px; height: ${height}px; object-fit: cover; box-shadow: -11px 11px 15px #000; align-self: center;" />`
	}

	return {
		icon,
		firstLine,
		secondLine
	}
}

export default html
