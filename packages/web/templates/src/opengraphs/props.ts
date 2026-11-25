import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';

export type OpengraphProps<Fields> = {
	piece: PublicWebPiece;
	fields: Fields;
	helpers: PieceComponentHelpers &
		Pick<typeof import('@luzzle/web.pieces'), 'formatPieceDate' | 'getTitleSizeRem'>;
};
