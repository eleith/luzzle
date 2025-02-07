import log from '../../log.js'
import { Command } from '../utils/types.js'
import { Argv } from 'yargs'
import {
	PieceArgv,
	PiecePositional,
	makePiecePathPositional,
	parsePiecePathPositionalArgv,
} from '../../pieces/index.js'

export type ValidateArgv = PieceArgv

const command: Command<ValidateArgv> = {
	name: 'validate',

	command: `validate ${PiecePositional}`,

	describe: 'validate a piece',

	builder: <T>(yargs: Argv<T>) => {
		return makePiecePathPositional(yargs)
	},

	run: async function (ctx, args) {
		const { file, markdown, piece } = await parsePiecePathPositionalArgv(ctx, args)
		const validate = piece.validate(markdown)

		if (validate.isValid) {
			console.log(`${file} is valid`)
		} else {
			log.error(`${file} has ${validate.errors.length} error(s): ${validate.errors.join(', ')}`)
		}
	},
}

export default command
