import { db } from '$lib/server/database'
import type { WebPiecesAsset, WebPieces } from '@luzzle/web.utils'
import type { WebPiece } from './types'

export async function hydrateWithAssets(piece: WebPieces): Promise<WebPiece>
export async function hydrateWithAssets(pieces: WebPieces[]): Promise<WebPiece[]>
export async function hydrateWithAssets(
	pieceOrPieces: WebPieces | WebPieces[]
): Promise<WebPiece | WebPiece[] | null> {
	const isArray = Array.isArray(pieceOrPieces)
	const pieces = isArray ? pieceOrPieces : [pieceOrPieces]

	if (pieces.length === 0) return isArray ? [] : null

	const paths = pieces.map((p) => p.file_path)
	const assets = await db
		.selectFrom('web_pieces_assets')
		.selectAll()
		.where('piece_file_path', 'in', paths)
		.execute()

	const assetMap = new Map<string, WebPiecesAsset[]>()
	for (const asset of assets) {
		const list = assetMap.get(asset.piece_file_path) || []
		list.push(asset)
		assetMap.set(asset.piece_file_path, list)
	}

	const hydrated = pieces.map((p) => ({
		...p,
		assets: assetMap.get(p.file_path) || []
	}))

	return isArray ? hydrated : hydrated[0]
}
