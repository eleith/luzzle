import type { Snippet } from 'svelte';
import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';

export type PageNavbarProps = {
	background?: string;
	color?: string;
	hoverColor?: string;
	showRandom?: boolean;
};

type PageContentProps<Fields, Helpers> = {
	piece: PublicWebPiece;
	fields: Fields;
	tags: Array<{ slug: string; tag: string }>;
	helpers: Helpers;
};

// File-backed templates cannot import runtime modules. Supply the same utilities as props.
export type ServerPageProps<Fields> = PageContentProps<
	Fields,
	PieceComponentHelpers &
		Pick<
			typeof import('@luzzle/web.pieces'),
			'formatPieceDate' | 'safeExternalUrl' | 'interpolate'
		> & {
			requestNavBar(options: PageNavbarProps): void;
		}
>;

export type PageProps<Fields> = PageContentProps<
	Fields,
	PieceComponentHelpers & { navBar: Snippet<[options: PageNavbarProps]> }
>;
