import type { PieceIconPalette, PublicWebPiece } from '@luzzle/web.pieces';

export type ImageFormat = 'jpg' | 'avif' | 'webp' | 'png';

export interface BoundPieceHelpers {
	getUrl(): string;
	getPalette(): PieceIconPalette | undefined;
	getImageUrl(
		assetKey: string | null | undefined,
		minWidth: number,
		format: ImageFormat
	): string | undefined;
	getAssetUrl(assetKey: string, transformation: string): string | undefined;
	getAssetContent(assetKey: string, transformation: string): string | undefined;
}

export interface TemplateHelpers {
	forPiece(piece: PublicWebPiece): BoundPieceHelpers;
	getStaticAssetUrl(relativePath: string): string | undefined;
}
