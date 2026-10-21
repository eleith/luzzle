import type { PublicWebPiece } from '@luzzle/web.pieces';
import type { Component } from 'svelte';

/** Resolved positive pixel dimensions supplied to an authored template. */
export interface TemplateSize {
	readonly width: number;
	readonly height: number;
}

export interface NavBannerColors {
	readonly background?: string;
	readonly color?: string;
	readonly hoverColor?: string;
}

/** Inputs at a page/Open Graph component call, not the icon template's props. */
export interface PieceIconInputs<T extends string = string> {
	readonly piece: PublicWebPiece & { readonly type: T };
	readonly size: {
		readonly width: number;
		/** Omission resolves to width * 1.5 before rendering the icon. */
		readonly height?: number;
	};
	readonly lazy?: boolean;
	readonly active?: boolean;
}

export interface PieceComponents {
	readonly PieceIcon: Component<PieceIconInputs>;
}
