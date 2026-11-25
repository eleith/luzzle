import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';

export type OpengraphProps<Fields> = {
	piece: PublicWebPiece;
	fields: Fields;
	helpers: PieceComponentHelpers;
};

// File-backed templates receive formatting utilities instead of importing runtime modules.
export type ServerOpengraphProps<Fields> = OpengraphProps<Fields> & {
	helpers: Pick<typeof import('@luzzle/web.pieces'), 'formatPieceDate' | 'getTitleSizeRem'>;
};
