import type { PublicWebPiece } from '@luzzle/web.pieces';
import type { PageComponents, TemplateSize } from '../components/props.js';
import type { TemplateHelpers } from '../helpers.js';

export type { PieceIconInputs } from '../components/props.js';

export interface PieceTag {
	readonly tag: string;
	readonly slug: string;
}

interface PieceData<T extends string> {
	// Keep the canonical public shape. Schema-derived author typings are separate.
	readonly piece: PublicWebPiece & { readonly type: T };
}

export interface PiecePageProps<T extends string = string> {
	readonly data: PieceData<T> & { readonly tags: readonly PieceTag[] };
	readonly helpers: TemplateHelpers;
	readonly components: PageComponents;
}

export interface PieceIconOptions {
	readonly size: TemplateSize;
	readonly lazy: boolean;
	readonly active: boolean;
}

export interface PieceIconProps<T extends string = string> {
	readonly data: PieceData<T>;
	readonly options: PieceIconOptions;
	readonly helpers: TemplateHelpers;
}

export interface PieceOpengraphProps<T extends string = string> {
	readonly data: PieceData<T>;
	readonly options: { readonly size: TemplateSize };
	readonly helpers: TemplateHelpers;
}
