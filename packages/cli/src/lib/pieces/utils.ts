import { Argv } from 'yargs'
import { stat } from 'fs/promises'
import { createHash, randomBytes } from 'crypto'
import { Context } from '../commands/index.js'
import Piece from './piece.js'
import { PieceFrontmatter, PieceFrontmatterSchemaField, PieceMarkdown } from '@luzzle/core'
import { Readable } from 'stream'
import { createReadStream, ReadStream } from 'fs'
import path from 'path'
import { ASSETS_DIRECTORY } from '../assets.js'
import { Storage } from '../storage/index.js'
import { fileTypeStream } from 'file-type'
import { pipeline } from 'stream/promises'
import got, { Request } from 'got'

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

async function downloadToStream(fileOrUrl: string) {
	if (/https?:\/\//i.test(fileOrUrl)) {
		return got.stream(fileOrUrl)
	}

	const coverStat = await stat(fileOrUrl).catch(() => null)

	if (coverStat && coverStat.isFile()) {
		return createReadStream(fileOrUrl)
	}

	throw new Error(`${fileOrUrl} is not a valid file`)
}

function calculateHashFromFile(stream: Readable): Promise<string> {
	const hash = createHash('md5')

	return new Promise((resolve, reject) => {
		stream.on('error', (err) => {
			reject(err)
		})
		stream.on('data', (data) => hash.update(data))
		stream.on('end', () => resolve(hash.digest('hex')))
	})
}

async function makePieceAttachment(
	file: string,
	field: PieceFrontmatterSchemaField,
	stream: Readable | ReadStream | Request,
	storage: Storage
): Promise<string> {
	const format = field.type === 'array' ? field.items.format : field.format
	const fileDir = path.dirname(file)
	const random = randomBytes(4).toString('hex')
	const baseName = path.basename(file).replace(/\.[^.]+$/, '')
	const parts = [baseName, random]
	const attachDir = path.join(ASSETS_DIRECTORY, fileDir, field.name)
	const exists = await storage.exists(attachDir)

	/* c8 ignore next 3 */
	if (format !== 'asset') {
		throw new Error(`${field} is not an attachable field for ${file}`)
	}

	if (!exists) {
		await storage.makeDirectory(attachDir)
	}

	const ext =
		(stream as Request).requestUrl?.pathname || (stream as ReadStream).path?.toString() || ''
	const streamWithFileType = await fileTypeStream(stream)
	const type = streamWithFileType?.fileType?.ext.replace(/^/, '.') || path.extname(ext)
	const filename = `${parts.filter((x) => x).join('-')}${type}`
	const relPath = path.join(ASSETS_DIRECTORY, fileDir, field.name, filename)
	const writeStream = storage.createWriteStream(relPath)

	await pipeline(streamWithFileType, writeStream)

	return relPath
}

async function makePieceValue(
	field: PieceFrontmatterSchemaField,
	value: number | string | boolean | Readable
) {
	const isArray = field.type === 'array'
	const format = isArray ? field.items.format : field.format
	const type = isArray ? field.items.type : field.type

	if (format === 'asset') {
		if (typeof value === 'string') {
			if (value.startsWith(ASSETS_DIRECTORY)) {
				return value
			}
			return downloadToStream(value) as Promise<Readable>
		} else if (value instanceof Readable) {
			return value
		} else {
			throw new Error(`${field} must be a string or stream`)
		}
	} else if (type === 'boolean') {
		return /1|true|yes/.test(value as string)
	} else if (type === 'integer') {
		return parseInt(value as string)
	}

	return value.toString()
}

export {
	PieceFileType,
	PiecePositional,
	parsePieceOptionArgv,
	parsePiecePathPositionalArgv,
	calculateHashFromFile,
	makePieceOption,
	makePiecePathPositional,
	makePieceAttachment,
	makePieceValue,
}
