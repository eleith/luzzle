import {
	linkDatabaseJtdSchema,
	linkMarkdownJtdSchema,
	PieceSelectable,
	Piece,
	PieceUpdatable,
	PieceInsertable,
	type LinkMarkdown,
} from '@luzzle/kysely'

type LinkType = typeof Piece.Link
type LinkSelectable = PieceSelectable<LinkType>
type LinkUpdateable = PieceUpdatable<LinkType>
type LinkInsertable = PieceInsertable<LinkType>

export {
	linkMarkdownJtdSchema,
	linkDatabaseJtdSchema,
	type LinkType,
	type LinkSelectable,
	type LinkInsertable,
	type LinkUpdateable,
	type LinkMarkdown,
}
