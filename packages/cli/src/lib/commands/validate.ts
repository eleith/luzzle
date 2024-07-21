import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import {
	PieceArgv,
	PieceCommandOption,
	makePieceCommand,
	parsePieceArgv,
	PieceMarkdownError,
} from '../pieces/index.js'

export type ValidateArgv = PieceArgv

const command: Command<ValidateArgv> = {
	name: 'validate',

	command: `validate ${PieceCommandOption}`,

	describe: 'validate a piece',

	builder: <T>(yargs: Argv<T>) => {
		return makePieceCommand(yargs)
	},

	run: async function (ctx, args) {
		const { slug, name } = await parsePieceArgv(ctx, args)
		const piece = await ctx.pieces.getPiece(name)

		try {
			await piece.get(slug)
			log.info(`${slug} is valid`)
		} catch (e) {
			if (e instanceof PieceMarkdownError) {
				const errors = piece.getErrors(e)
				log.error(`${slug} has ${errors.length} error(s): ${errors.join(', ')}`)
			} else {
				log.error(e)
			}
		}
	},
}

export default command
