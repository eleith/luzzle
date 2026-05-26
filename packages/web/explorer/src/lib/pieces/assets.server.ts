import { db } from '$lib/server/database'
import type { WebPieces, WebPiecesAsset } from '@luzzle/web.db'
import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'

type WebPiece = WebPieces & { assets: WebPiecesAsset[] }

async function fetchAssets(paths: string[]) {
	return db
		.selectFrom('web_pieces_assets')
		.selectAll()
		.where('piece_file_path', 'in', paths)
		.orderBy('piece_asset_path')
		.orderBy('transformation')
		.execute()
}

function toPublicAsset(asset: WebPiecesAsset): PublicWebPieceAsset {
	return {
		asset_key: asset.asset_key,
		transformation: asset.transformation,
		asset_path: asset.asset_path,
		mime_type: asset.mime_type,
		is_embedded: asset.is_embedded,
		content: asset.content
	}
}

function toPublicPiece(piece: WebPieces, assets: WebPiecesAsset[]): PublicWebPiece {
	const { file_path: _file_path, json_metadata, ...rest } = piece
	return {
		...rest,
		metadata: JSON.parse(json_metadata || '{}'),
		assets: assets.map(toPublicAsset)
	}
}

export async function hydrateWithAssets(piece: WebPieces): Promise<PublicWebPiece>
export async function hydrateWithAssets(pieces: WebPieces[]): Promise<PublicWebPiece[]>
export async function hydrateWithAssets(
	pieceOrPieces: WebPieces | WebPieces[]
): Promise<PublicWebPiece | PublicWebPiece[]> {
	const isArray = Array.isArray(pieceOrPieces)
	const pieces = isArray ? pieceOrPieces : [pieceOrPieces]

	if (pieces.length === 0) return []

	const paths = pieces.map((piece) => piece.file_path)
	const assets = await fetchAssets(paths)
	const groupedAssets = Object.groupBy(assets, (asset) => asset.piece_file_path)

	const hydrated = pieces.map((piece) => toPublicPiece(piece, groupedAssets[piece.file_path] ?? []))

	return isArray ? hydrated : hydrated[0]
}

export async function hydrateWithAssetsInternal(piece: WebPieces): Promise<WebPiece>
export async function hydrateWithAssetsInternal(pieces: WebPieces[]): Promise<WebPiece[]>
export async function hydrateWithAssetsInternal(
	pieceOrPieces: WebPieces | WebPieces[]
): Promise<WebPiece | WebPiece[]> {
	const isArray = Array.isArray(pieceOrPieces)
	const pieces = isArray ? pieceOrPieces : [pieceOrPieces]

	if (pieces.length === 0) return []

	const paths = pieces.map((piece) => piece.file_path)
	const assets = await fetchAssets(paths)
	const groupedAssets = Object.groupBy(assets, (asset) => asset.piece_file_path)

	const hydrated = pieces.map((piece) => ({
		...piece,
		assets: groupedAssets[piece.file_path] ?? []
	}))

	return isArray ? hydrated : hydrated[0]
}
