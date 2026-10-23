import { db } from '$lib/server/database'
import type { WebPieces, WebPiecesAsset } from '@luzzle/web.db'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import { mapPieceTemplates, type TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
import { config } from '$lib/server/config'

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

function toPublicPiece(piece: WebPieces, assets: WebPiecesAsset[]): TemplatedPiece {
	const {
		file_path: _file_path,
		json_metadata,
		content_hash: _content_hash,
		last_published_at: _last_published_at,
		...rest
	} = piece
	return mapPieceTemplates(
		{
			...rest,
			metadata: JSON.parse(json_metadata || '{}'),
			assets: assets.map(toPublicAsset)
		},
		config.pieces.find((entry) => entry.type === piece.type)
	)
}

export async function hydrateWithAssets(piece: WebPieces): Promise<TemplatedPiece>
export async function hydrateWithAssets(pieces: WebPieces[]): Promise<TemplatedPiece[]>
export async function hydrateWithAssets(
	pieceOrPieces: WebPieces | WebPieces[]
): Promise<TemplatedPiece | TemplatedPiece[]> {
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
