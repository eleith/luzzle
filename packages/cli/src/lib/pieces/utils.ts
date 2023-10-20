import { existsSync } from 'fs'
import path from 'path'
import { Argv } from 'yargs'
import { PieceTables, PieceTable } from '@luzzle/kysely'

export const PieceDirectory = {
	Root: 'root',
	Assets: 'assets',
	AssetsCache: 'assets.cache',
} as const

export type PieceDirectories = {
	[key in typeof PieceDirectory[keyof typeof PieceDirectory]]: string
}

export type PieceArgv = {
	path: string
	piece?: string
}

export type PieceTypes = PieceTables

const PieceType = PieceTable
const PieceFileType = 'md'
const PieceCommandOption = '<slug|path>'

const parsePieceArgv = function (args: PieceArgv): { slug: string; piece: PieceTables } {
	const piece = args.piece as PieceTables
	const slug = args.path
	const pathParsed = path.parse(slug)
	const isMarkdown = pathParsed.ext === `.${PieceFileType}`

	if (piece) {
		return { slug, piece }
	} else if (isMarkdown && existsSync(slug)) {
		const dir = /^\.?$/.test(pathParsed.dir) ? path.parse(path.resolve(slug)).dir : pathParsed.dir

		return {
			slug: pathParsed.name,
			piece: path.parse(dir).name as PieceTables,
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

const makePieceCommand = function <T>(yargs: Argv<T>, alias = 'slug'): Argv<T & PieceArgv> {
	return yargs
		.option('piece', {
			type: 'string',
			alias: 'p',
			description: `piece type, required if using <${alias}>`,
			choices: Object.values(PieceTable),
		})
		.positional('path', {
			type: 'string',
			alias,
			description: `<path|${alias}> of piece`,
			demandOption: `<path|${alias}> is required`,
		})
}

export { PieceType, PieceFileType, PieceCommandOption, parsePieceArgv, makePieceCommand }
