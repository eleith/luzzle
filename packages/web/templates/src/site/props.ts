import type { PublicWebPiece } from '@luzzle/web.pieces';
import type { PieceComponents } from '../components/props.js';
import type { PageTemplateHelpers } from '../helpers.js';

export interface RootPageProps {
	readonly data: {
		readonly types: readonly string[];
		readonly pieces: readonly PublicWebPiece[];
	};
	readonly helpers: PageTemplateHelpers;
	readonly components: PieceComponents;
}

export interface FeedReference {
	readonly url: string;
	readonly type: 'piece' | 'tag';
	readonly label: string;
}

export interface FeedPageProps {
	readonly data: {
		readonly feed: FeedReference;
		readonly pieces: readonly PublicWebPiece[];
	};
	readonly helpers: PageTemplateHelpers;
	readonly components: PieceComponents;
}

export interface ErrorPageProps {
	readonly data: {
		readonly status: number;
		/** Safe public text, never a private debugging message or stack trace. */
		readonly message: string;
	};
	readonly helpers: PageTemplateHelpers;
	readonly components: PieceComponents;
}
