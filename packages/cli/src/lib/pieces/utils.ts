import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { Argv } from 'yargs'
import { Pieces, Piece } from '@luzzle/core'
import { temporaryFile } from 'tempy'
import { copyFile, stat } from 'fs/promises'
import { downloadToPath } from '../web.js'
import { createHash } from 'crypto'

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

const parsePieceArgv = function (args: PieceArgv): { slug: string; piece: Pieces } {
	const piece = args.piece as Pieces | undefined
	const slug = args.path
	const pathParsed = path.parse(slug)
	const isMarkdown = pathParsed.ext === `.${PieceFileType}`

	if (piece) {
		return { slug, piece }
	} else if (isMarkdown && existsSync(slug)) {
		const dir = /^\.?$/.test(pathParsed.dir) ? path.parse(path.resolve(slug)).dir : pathParsed.dir

		return {
			slug: pathParsed.name,
			piece: path.parse(dir).name as Pieces,
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

const parseOptionalPieceArgv = function (args: PieceOptionalArgv): {
	slug?: string
	piece: Pieces
} | null {
	const { path, piece } = args

	if (path) {
		return parsePieceArgv({ path, piece })
	} else if (piece) {
		return { piece: piece as Pieces }
	}

	return null
}

const makePieceCommand = function <T>(yargs: Argv<T>, alias = 'slug'): Argv<T & PieceArgv> {
	return yargs
		.option('piece', {
			type: 'string',
			alias: 'p',
			description: `piece type, required if using <${alias}>`,
			choices: Object.values(Piece),
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
			choices: Object.values(Piece),
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
	Piece,
	type Pieces,
}
