import {
	textFrontmatterJtdSchema,
	PieceSelectable,
	Piece,
	PieceUpdatable,
	PieceInsertable,
	type TextFrontmatter,
} from '@luzzle/kysely'

type TextType = typeof Piece.Text
type TextSelectable = PieceSelectable<TextType>
type TextUpdateable = PieceUpdatable<TextType>
type TextInsertable = PieceInsertable<TextType>

export {
	textFrontmatterJtdSchema,
	type TextType,
	type TextSelectable,
	type TextInsertable,
	type TextUpdateable,
	type TextFrontmatter,
}
