import { type WebPieces } from '../../types'
import bookToParts from './book'
import posterToParts from './poster'
import cartridgeToParts from './cartridge'
import articleToParts from './article'

type IconParts = {
	icon: string
	firstLine: string
	secondLine: string
}

async function iconToParts(piece: WebPieces, media?: Buffer): Promise<IconParts> {
	if (piece.type === 'books') {
		return await bookToParts(piece, media)
	} else if (piece.type === 'games') {
		return await cartridgeToParts(piece, media)
	} else if (piece.type === 'links' || piece.type === 'texts') {
		return await articleToParts(piece, media)
	} else {
		return await posterToParts(piece, media)
	}
}

export default iconToParts
