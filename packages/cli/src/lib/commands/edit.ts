import log from '../log.js'
import { spawn } from 'child_process'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { Pieces, PieceArgv } from '../pieces/index.js'
import { BookPiece } from '../books/index.js'

export type EditArgv = PieceArgv

const command: Command<EditArgv> = {
	name: 'edit',

	command: `edit ${Pieces.COMMAND}`,

	describe: 'edit a piece',

	builder: <T>(yargs: Argv<T>) => {
		return Pieces.command(yargs)
	},

	run: async function (ctx, args) {
		const dir = ctx.directory
		const { slug } = Pieces.parseArgv(args)
		const bookPiece = new BookPiece(dir)

		if (!bookPiece.exists(slug)) {
			log.error(`${slug} was not found`)
			return
		}

		if (!process.env.EDITOR) {
			log.error('could not find an editor')
			return
		}

		const piecePath = bookPiece.getPath(slug)

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
