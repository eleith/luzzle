import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import { PieceArgv, PieceCommandOption, makePieceCommand, parsePieceArgv } from '../pieces/index.js'

export type AttachArgv = { file: string } & PieceArgv

const command: Command<AttachArgv> = {
	name: 'attach',

	command: `attach ${PieceCommandOption} <file|url>`,

	describe: 'download and attach a file to a piece',

	builder: function <T>(yargs: Argv<T>) {
		return makePieceCommand(yargs).positional('file', {
			type: 'string',
			alias: 'url',
			description: 'file to attach',
			demandOption: 'file (or url) is required',
		})
	},

	run: async function (ctx, args) {
		const { slug, piece } = parsePieceArgv(args)
		const file = args.file
		const pieces = await ctx.pieces.getPiece(piece)

		if (pieces.exists(slug) === false) {
			log.info(`${slug} was not found`)
			return
		}

		if (ctx.flags.dryRun === false) {
			await pieces.attach(slug, file)
		}

		log.info(`uploaded ${file} to ${pieces.getFileName(slug)}`)
	},
}

export default command
