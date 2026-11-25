import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces';

export type IconProps<Fields> = {
	piece: PublicWebPiece;
	fields: Fields;
	helpers: PieceComponentHelpers;
	size: { width: number; height?: number };
	lazy?: boolean;
	active?: boolean;
};
