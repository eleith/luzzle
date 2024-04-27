import {
	Frontmatter as BookFrontmatter,
	name as BookName,
	FrontmatterJSONSchema as BookFrontmatterJSONSchema,
} from './books/index.js'
import {
	Frontmatter as LinkFrontmatter,
	name as LinkName,
	FrontmatterJSONSchema as LinkFrontmatterJSONSchema,
} from './links/index.js'
import {
	Frontmatter as TextFrontmatter,
	name as TextName,
	FrontmatterJSONSchema as TextFrontmatterJSONSchema,
} from './texts/index.js'
import {
	Frontmatter as GameFrontmatter,
	name as GameName,
	FrontmatterJSONSchema as GameFrontmatterJSONSchema,
} from './games/index.js'
import { SchemaDateStringToDatabaseNumber } from '../../database/utils.js'
import { PieceCommonDatabaseFields } from './common.js'

const Piece = {
	[BookName]: BookName,
	[LinkName]: LinkName,
	[TextName]: TextName,
	[GameName]: GameName,
} as const

const PieceJSONSchemas = {
	[BookName]: BookFrontmatterJSONSchema,
	[LinkName]: LinkFrontmatterJSONSchema,
	[TextName]: TextFrontmatterJSONSchema,
	[GameName]: GameFrontmatterJSONSchema,
}

type Pieces = (typeof Piece)[keyof typeof Piece]

type PieceTables = {
	[BookName]: SchemaDateStringToDatabaseNumber<BookFrontmatter> & PieceCommonDatabaseFields
	[LinkName]: SchemaDateStringToDatabaseNumber<LinkFrontmatter> & PieceCommonDatabaseFields
	[TextName]: SchemaDateStringToDatabaseNumber<TextFrontmatter> & PieceCommonDatabaseFields
	[GameName]: SchemaDateStringToDatabaseNumber<GameFrontmatter> & PieceCommonDatabaseFields
}

type PiecesCommonTable = {
	type: Pieces
	title: string
	summary: string | null
	media: string | null
	json_metadata: string | null
	date_consumed: number | null
} & PieceCommonDatabaseFields

export {
	type PieceTables,
	type Pieces,
	type PiecesCommonTable,
	type PieceCommonDatabaseFields,
	Piece,
	PieceJSONSchemas,
}
