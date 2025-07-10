import bookToParts from './book.js'
import posterToParts from './poster.js'
import cartridgeToParts from './cartridge.js'
import articleToParts from './article.js'
import playingCardToParts from './playing-card.js'
import { type WebPieces } from '../utils/types.js'

type IconParts = {
	icon: string
	firstLine: string
	secondLine: string
}

async function iconToParts(piece: WebPieces, media?: Buffer): Promise<IconParts> {
	const metadata = piece.json_metadata ? JSON.parse(piece.json_metadata) : {}

	if (piece.type === 'books') {
		return await bookToParts(piece, media)
	} else if (piece.type === 'games') {
		if (metadata.type === 'video') {
			return await cartridgeToParts(piece, media)
		} else {
			return await playingCardToParts(piece, media)
		}
	} else if (piece.type === 'links' || piece.type === 'texts') {
		return await articleToParts(piece, media)
	} else {
		return await posterToParts(piece, media)
	}
}

export default iconToParts
