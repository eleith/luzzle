import { db } from '$lib/server/database'
import type { WebPieces } from '@luzzle/web.utils'
import type { WebPiece } from './types'

export async function hydrateWithAssets(piece: WebPieces): Promise<WebPiece>
export async function hydrateWithAssets(pieces: WebPieces[]): Promise<WebPiece[]>
export async function hydrateWithAssets(
	pieceOrPieces: WebPieces | WebPieces[]
): Promise<WebPiece | WebPiece[]> {
	const isArray = Array.isArray(pieceOrPieces)
	const pieces = isArray ? pieceOrPieces : [pieceOrPieces]

	if (pieces.length === 0) return []

	const paths = pieces.map((piece) => piece.file_path)
	const assets = await db
		.selectFrom('web_pieces_assets')
		.selectAll()
		.where('piece_file_path', 'in', paths)
		.execute()

	const groupedAssets = Object.groupBy(assets, (asset) => asset.piece_file_path)
	const hydrated = pieces.map((piece) => ({
		...piece,
		assets: groupedAssets[piece.file_path] ?? []
	}))

	return isArray ? hydrated : hydrated[0]
}
