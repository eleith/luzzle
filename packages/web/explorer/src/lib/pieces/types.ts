import type { WebPieces, WebPiecesAsset } from '@luzzle/web.utils'

export type WebPiece = WebPieces & {
	assets: WebPiecesAsset[]
}

export type PublicWebPieceAsset = Pick<
	WebPiecesAsset,
	'asset_key' | 'transformation' | 'asset_path' | 'mime_type' | 'is_embedded' | 'content'
>

export type PublicWebPiece = Omit<WebPieces, 'file_path' | 'json_metadata'> & {
	metadata: Record<string, unknown>
	assets: PublicWebPieceAsset[]
}
