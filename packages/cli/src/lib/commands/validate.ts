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
		const { slug, piece } = parsePieceArgv(args)
		const pieces = await ctx.pieces.getPiece(piece)

		if (!pieces.exists(slug)) {
			log.error(`${slug} was not found`)
			return
		}

		try {
			await pieces.get(slug)
			log.info(`${slug} is valid`)
			return
		} catch (e) {
			if (e instanceof PieceMarkdownError) {
				const errorMessage = [`${slug} has ${e.validationErrors?.length} error(s)\n`]

				e.validationErrors?.map((error) => {
					const path = error.instancePath.replace('/frontmatter/', '')
					errorMessage.push(`${path}: ${error.message}`)
				})

				log.error(errorMessage.join('\n'))
				return
			}
		}
	},
}

export default command
