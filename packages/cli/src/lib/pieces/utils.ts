import { createReadStream } from 'fs'
import { Argv } from 'yargs'
import { temporaryFile } from 'tempy'
import { copyFile, stat } from 'fs/promises'
import { downloadToPath } from '../web.js'
import { createHash } from 'crypto'
import { Context } from '../commands/index.js'
import Piece from './piece.js'
import { PieceFrontmatter, PieceMarkdown } from '@luzzle/core'
import path from 'path'

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
		return { piece: ctx.pieces.getPiece(piece) }
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
	const fullPath = path.resolve(file)
	const pieceNames = await ctx.pieces.getTypes()
	const pieceName = ctx.pieces.getTypeFromFile(file)

	if (pieceNames.length === 0) {
		throw new Error(`no piece types were found. please add some schemas`)
	}

	if (pieceName && pieceNames.includes(pieceName)) {
		const piece = ctx.pieces.getPiece(pieceName)
		const relativePath = path.relative(ctx.pieces.directory, fullPath)

		const markdown = await piece.get(relativePath)
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

async function downloadFileOrUrlTo(file: string): Promise<string> {
	const tempPath = temporaryFile()

	if (/https?:\/\//i.test(file)) {
		await downloadToPath(file, tempPath)
		return tempPath
	}

	const coverStat = await stat(file)

	if (coverStat.isFile()) {
		await copyFile(file, tempPath)
		return tempPath
	}

	throw new Error(`${file} is not a valid file`)
}

function calculateHashFromFile(file: string): Promise<string> {
	const stream = createReadStream(file)
	const hash = createHash('md5')

	return new Promise((resolve, reject) => {
		stream.on('error', (err) => {
			reject(err)
		})
		stream.on('data', (data) => hash.update(data))
		stream.on('end', () => resolve(hash.digest('hex')))
	})
}

export {
	PieceFileType,
	PiecePositional,
	parsePieceOptionArgv,
	parsePiecePathPositionalArgv,
	downloadFileOrUrlTo,
	calculateHashFromFile,
	makePieceOption,
	makePiecePathPositional,
}
