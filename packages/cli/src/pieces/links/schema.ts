import {
	linkDatabaseJtdSchema,
	linkFrontmatterJtdSchema,
	PieceSelectable,
	Piece,
	PieceUpdatable,
	PieceInsertable,
	type LinkFrontmatter,
} from '@luzzle/kysely'

type LinkType = typeof Piece.Link
type LinkSelectable = PieceSelectable<LinkType>
type LinkUpdateable = PieceUpdatable<LinkType>
type LinkInsertable = PieceInsertable<LinkType>

export {
	linkFrontmatterJtdSchema,
	linkDatabaseJtdSchema,
	type LinkType,
	type LinkSelectable,
	type LinkInsertable,
	type LinkUpdateable,
	type LinkFrontmatter,
}
