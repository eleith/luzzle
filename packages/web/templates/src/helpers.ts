import type { PieceIconPalette, PublicWebPiece } from '@luzzle/web.pieces';
import type { NavBannerColors } from './components/props.js';

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

/** Page-only presentation controls; icon and Open Graph templates use TemplateHelpers. */
export interface PageTemplateHelpers extends TemplateHelpers {
	/** Request the app-owned banner; no call means no banner, no arguments means defaults. */
	showNavBanner(colors?: NavBannerColors): void;
}

export interface TemplateHelpers {
	forPiece(piece: PublicWebPiece): BoundPieceHelpers;
	/** Construct a URL; invalid paths are unlinked, but file availability is not checked. */
	getStaticAssetUrl(relativePath: string): string | undefined;
}
