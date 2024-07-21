import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { Argv } from 'yargs'
import { temporaryFile } from 'tempy'
import { copyFile, stat } from 'fs/promises'
import { downloadToPath } from '../web.js'
import { createHash } from 'crypto'
import { Context } from '../commands/index.js'

export const PieceDirectory = {
	Root: 'root',
	Assets: 'assets',
} as const

export type PieceDirectories = {
	[key in (typeof PieceDirectory)[keyof typeof PieceDirectory]]: string
}

export type PieceArgv = {
	path: string
	piece?: string
}

export type PieceOptionalArgv = {
	path?: string
	piece?: string
}

const PieceFileType = 'md'
const PieceCommandOption = '<slug|path>'
const PieceOptionalCommandOption = '[slug|path]'

async function parsePieceArgv(
	ctx: Context,
	args: PieceArgv
): Promise<{ slug: string; name: string }> {
	const piece = args.piece
	const slug = args.path
	const pathParsed = path.parse(slug)
	const isMarkdown = slug && pathParsed.ext === `.${PieceFileType}`

	if (piece) {
		const pieceNames = await ctx.pieces.findPieceNames()

		if (pieceNames.includes(piece)) {
			return { slug, name: piece }
		}

		throw new Error(`'${piece}' is not a valid piece`)
	} else if (isMarkdown && existsSync(slug)) {
		const dir = /^\.?$/.test(pathParsed.dir) ? path.parse(path.resolve(slug)).dir : pathParsed.dir

		return {
			slug: pathParsed.name,
			name: path.parse(dir).name,
		}
	}

	if (isMarkdown) {
		throw new Error(`${slug} does not exist`)
	} else if (pathParsed.dir === '') {
		throw new Error(`piece option is required, learn more with --help`)
	} else {
		throw new Error(`${slug} is not a valid piece`)
	}
}

async function parseOptionalPieceArgv(
	ctx: Context,
	args: PieceOptionalArgv
): Promise<{
	slug?: string
	name: string
} | null> {
	const { path, piece } = args

	if (path) {
		return parsePieceArgv(ctx, { path, piece })
	} else if (piece) {
		return { name: piece }
	}

	return null
}

const makePieceCommand = function <T>(yargs: Argv<T>, alias = 'slug'): Argv<T & PieceArgv> {
	return yargs
		.option('piece', {
			type: 'string',
			alias: 'p',
			description: `piece type, required if using <${alias}>`,
		})
		.positional('path', {
			type: 'string',
			alias: alias,
			description: `<path|${alias}> of piece`,
			demandOption: `<path|${alias}> is required`,
		})
}

const makeOptionalPieceCommand = function <T>(
	yargs: Argv<T>,
	alias = 'slug'
): Argv<T & PieceOptionalArgv> {
	return yargs
		.option('piece', {
			type: 'string',
			alias: 'p',
			description: `piece type, required if using <${alias}>`,
		})
		.positional('path', {
			type: 'string',
			alias: alias,
			description: `<path|${alias}> of piece`,
			demandOption: false,
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
	PieceCommandOption,
	PieceOptionalCommandOption,
	parsePieceArgv,
	parseOptionalPieceArgv,
	makePieceCommand,
	makeOptionalPieceCommand,
	downloadFileOrUrlTo,
	calculateHashFromFile,
}
