import type { PublicWebPiece } from '@luzzle/web.pieces';
import type { Component } from 'svelte';

/** Resolved positive pixel dimensions supplied to an authored template. */
export interface TemplateSize {
	readonly width: number;
	readonly height: number;
}

export interface NavBannerInputs {
	readonly background?: string;
	readonly color?: string;
	readonly hoverColor?: string;
	readonly showHome?: boolean;
	readonly showSearch?: boolean;
	readonly showThemeToggle?: boolean;
	readonly showProgress?: boolean;
	readonly showRandom?: boolean;
}

/** Inputs at a page's component call, not the icon template's props. */
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

export interface PageComponents {
	readonly NavBanner: Component<NavBannerInputs>;
	readonly PieceIcon: Component<PieceIconInputs>;
}
