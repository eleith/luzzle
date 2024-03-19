import { sql } from 'kysely'
import { getDatabaseClient } from './database/client.js'
import migrate from './database/migrations.js'
import ajv from './lib/ajv.js'

export {
	luzzleEnumKeyword,
	luzzleFormatKeyword,
	luzzlePatternKeyword,
	extractFullMarkdown,
	addFrontMatter,
} from './lib/index.js'

export {
	type PieceSelectable,
	type PieceUpdatable,
	type PieceInsertable,
	type PieceTable,
	type PieceTables,
	type Pieces,
	type PiecesCommonTable,
	type PiecesCommonSelectable,
	type PieceDatabaseOnlyFields,
	type PieceCommonFields,
	Piece,
} from './pieces/tables.schema.js'

export {
	type LuzzleTables,
	type LuzzleDatabase,
	type LuzzleInsertable,
	type LuzzleUpdatable,
	type LuzzleSelectable,
	type LuzzleTableNames,
	LuzzleTableName,
} from './database/tables/index.js'

export {
	getPieceSchema,
	type PieceFrontmatterJtdSchemas,
	type PieceFrontmatterJtdSchema,
	type PieceFrontmatter,
	type PieceFrontmatterFields,
	type PieceFrontmatterLuzzleMetadata,
	type PieceFrontmatterSchemaField,
	getPieceFrontmatterKeysFromSchema,
	formatPieceFrontmatterValue,
	unformatPieceFrontmatterValue,
	extractFrontmatterSchemaField,
	initializePieceFrontMatter,
	type PieceMarkdown,
	PieceMarkdownError,
	makePieceMarkdownOrThrow,
	makePieceMarkdown,
	makePieceMarkdownString,
	makePieceInsertable,
	makePieceUpdatable,
} from './pieces/jtd.schema.js'

export { getDatabaseClient, migrate, sql, ajv }
