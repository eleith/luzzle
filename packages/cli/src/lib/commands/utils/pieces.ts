import { Argv } from 'yargs'
import { Context } from '../index.js'
import { Piece, PieceFrontmatter, PieceMarkdown } from '@luzzle/core'

export const PieceDirectory = {
	Root: 'root',
	Assets: 'assets',
	Luzzle: 'luzzle',
} as const

export type PieceDirectories = {
	[key in (typeof PieceDirectory)[keyof typeof PieceDirectory]]: string
}

export type PieceArgv = {
	piece: string
}

const PieceFileType = 'md'
const PiecePositional = `[piece]`

async function parsePieceOptionArgv(
	ctx: Context,
	args: PieceArgv
): Promise<{ piece: Piece<PieceFrontmatter> }> {
	const piece = args.piece
	const pieceNames = await ctx.pieces.getTypes()

	if (pieceNames.includes(piece)) {
		return { piece: await ctx.pieces.getPiece(piece) }
	}

	throw new Error(`piece [${piece}] does not exist`)
}

async function parsePiecePathPositionalArgv(
	ctx: Context,
	args: PieceArgv
): Promise<{
	file: string
	piece: Piece<PieceFrontmatter>
	markdown: PieceMarkdown<PieceFrontmatter>
}> {
	const file = args.piece
	const pieceNames = await ctx.pieces.getTypes()
	const pieceType = ctx.pieces.parseFilename(file).type

	if (pieceNames.length === 0) {
		throw new Error(`no piece types were found. please add some schemas`)
	}

	if (pieceType && pieceNames.includes(pieceType)) {
		const piece = await ctx.pieces.getPiece(pieceType)
		const filePath = ctx.storage.parseArgPath(file)
		const markdown = await piece.get(filePath)
		return { file, piece, markdown }
	}

	throw new Error(`file [${file}] is not a valid piece, use: ${pieceNames.join(', ')}`)
}

const makePieceOption = function <T>(yargs: Argv<T>): Argv<T & PieceArgv> {
	return yargs.option('piece', {
		type: 'string',
		alias: 'p',
		description: `piece type`,
		demandOption: `piece type is required`,
	})
}

const makePiecePathPositional = function <T>(yargs: Argv<T>): Argv<T & PieceArgv> {
	return yargs.positional('piece', {
		type: 'string',
		description: `path to the piece`,
		demandOption: `path to the piece is required`,
	})
}

export {
	PieceFileType,
	PiecePositional,
	parsePieceOptionArgv,
	parsePiecePathPositionalArgv,
	makePieceOption,
	makePiecePathPositional,
}
