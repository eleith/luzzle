import log from '../log.js'
import { spawn } from 'child_process'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import {
	PieceArgv,
	PiecePositional,
	makePiecePathPositional,
	parsePiecePathPositionalArgv,
} from '../pieces/index.js'
import path from 'path'
import { existsSync } from 'fs'

export type EditArgv = PieceArgv

const command: Command<EditArgv> = {
	name: 'edit',

	command: `edit ${PiecePositional}`,

	describe: 'edit a piece',

	builder: <T>(yargs: Argv<T>) => {
		return makePiecePathPositional(yargs)
	},

	run: async function (ctx, args) {
		const dir = ctx.directory
		const { file } = await parsePiecePathPositionalArgv(ctx, args)
		const resolved = path.resolve(file)

		if (!process.env.EDITOR) {
			log.error('could not find an editor')
			return
		}

		if (!existsSync(resolved)) {
			log.error(`file ${resolved} does not exist`)
			return
		}

		if (ctx.flags.dryRun === false) {
			spawn(process.env.EDITOR, [resolved], {
				cwd: dir,
				env: { ...process.env, LUZZLE: 'true' },
				stdio: 'inherit',
			}).on('exit', process.exit)
		} else {
			log.info(`editing ${file}`)
		}
	},
}

export default command
