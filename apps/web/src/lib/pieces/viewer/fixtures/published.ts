import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'

export function asset(
	transformation: string,
	asset_path: string | null = 'cover.jpg',
	asset_key = 'cover',
	mime_type = 'image/jpeg'
): PublicWebPieceAsset {
	return { asset_key, transformation, asset_path, mime_type }
}

export const publishedPiece: PublicWebPiece = {
	id: 'published-id',
	key: 'piece-key',
	title: 'Published <Book>',
	slug: 'published #?%',
	type: 'books',
	date_added: 1,
	date_updated: 2,
	metadata: { title: 'Serving metadata only' },
	assets: [asset('image.original', 'published/cover.jpg')]
}
