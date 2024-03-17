import log from '../log.js'
import { spawn } from 'child_process'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { PieceArgv, PieceCommandOption, makePieceCommand, parsePieceArgv } from '../pieces/index.js'

export type EditArgv = PieceArgv

const command: Command<EditArgv> = {
	name: 'edit',

	command: `edit ${PieceCommandOption}`,

	describe: 'edit a piece',

	builder: <T>(yargs: Argv<T>) => {
		return makePieceCommand(yargs)
	},

	run: async function (ctx, args) {
		const dir = ctx.directory
		const { slug, piece } = parsePieceArgv(args)
		const pieces = ctx.pieces.getPiece(piece)

		if (!process.env.EDITOR) {
			log.error('could not find an editor')
			return
		}

		const piecePath = pieces.getPath(slug)

		if (ctx.flags.dryRun === false) {
			spawn(process.env.EDITOR, [piecePath], {
				cwd: dir,
				env: { ...process.env, LUZZLE: 'true' },
				stdio: 'inherit',
			}).on('exit', process.exit)
		} else {
			log.info(`editing ${piecePath}`)
		}
	},
}

export default command
