import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import { Pieces, PieceArgv } from '../pieces/index.js'
import { BookPiece } from '../books/index.js'

export type AttachArgv = { file: string } & PieceArgv

const command: Command<AttachArgv> = {
	name: 'attach',

	command: `attach ${Pieces.COMMAND} <file|url>`,

	describe: 'download and attach a file to a piece',

	builder: function <T>(yargs: Argv<T>) {
		return Pieces.command(yargs).positional('file', {
			type: 'string',
			alias: 'url',
			description: 'file to attach',
			demandOption: 'file (or url) is required',
		})
	},

	run: async function (ctx, args) {
		const dir = ctx.directory
		const { slug } = Pieces.parseArgv(args)
		const file = args.file
		const bookPiece = new BookPiece(dir)

		if (bookPiece.exists(slug) === false) {
			log.info(`${slug} was not found`)
			return
		}

		if (ctx.flags.dryRun === false) {
			await bookPiece.attach(slug, file)
		}

		log.info(`uploaded ${file} to ${bookPiece.getFileName(slug)}`)
	},
}

export default command
