import type { Snippet } from 'svelte';
import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';

export type PageNavbarProps = {
	background?: string;
	color?: string;
	hoverColor?: string;
	showRandom?: boolean;
};

export type PageProps<Fields> = {
	piece: PublicWebPiece;
	fields: Fields;
	tags: Array<{ slug: string; tag: string }>;
	helpers: PieceComponentHelpers & {
		navBar: Snippet<[options: PageNavbarProps]>;
	};
};
