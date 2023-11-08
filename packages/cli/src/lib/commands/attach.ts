import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import {
	PieceArgv,
	PieceCommandOption,
	makePieceCommand,
	parsePieceArgv,
	downloadFileOrUrlTo,
} from '../pieces/index.js'
import { unlink } from 'fs/promises'

export type AttachArgv = { file: string; field?: string } & PieceArgv

const command: Command<AttachArgv> = {
	name: 'attach',

	command: `attach ${PieceCommandOption} <file|url>`,

	describe: 'attach a file to a piece field',

	builder: function <T>(yargs: Argv<T>) {
		return makePieceCommand(yargs)
			.positional('file', {
				type: 'string',
				alias: 'url',
				description: 'file to attach',
				demandOption: 'file (or url) is required',
			})
			.option('field', {
				type: 'string',
				description: 'field to attach file to',
			})
	},

	run: async function (ctx, args) {
		const { slug, piece } = parsePieceArgv(args)
		const file = args.file
		const field = args.field
		const pieces = await ctx.pieces.getPiece(piece)
		const markdown = await pieces.get(slug)

		if (!markdown) {
			log.info(`${slug} was not found`)
			return
		}

		if (ctx.flags.dryRun === false) {
			const tempPath = await downloadFileOrUrlTo(file)
			await pieces.attach(tempPath, markdown, field)
			await unlink(tempPath)
		}

		log.info(`uploaded ${file} to ${pieces.getFileName(slug)}`)
	},
}

export default command
