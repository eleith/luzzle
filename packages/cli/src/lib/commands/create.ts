import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { PieceType, PieceTypes } from '../pieces/index.js'
import slugify from '@sindresorhus/slugify'

export type CreateArgv = { piece: PieceTypes; title: string }

const command: Command<CreateArgv> = {
	name: 'create',

	command: `create <title>`,

	describe: 'create a new piece',

	builder: <T>(yargs: Argv<T>) => {
		return yargs
			.option('piece', {
				type: 'string',
				alias: 'p',
				description: `piece type`,
				choices: Object.values(PieceType),
				demandOption: `piece is required`,
			})
			.positional('title', {
				type: 'string',
				description: `title of piece`,
				demandOption: `title is required`,
			}) as Argv<T & CreateArgv>
	},

	run: async function (ctx, args) {
		const { title, piece } = args
		const pieces = await ctx.pieces.getPiece(piece)
		const slug = slugify(title)

		if (pieces.exists(slug)) {
			log.error(`${piece} already exists at ${pieces.getFileName(slug)}`)
			return
		}

		if (ctx.flags.dryRun === false) {
			const markdown = pieces.create(slug, title)
			pieces.write(markdown)
			log.info(`created new ${piece} at ${pieces.getFileName(slug)}`)
		} else {
			log.info(`created new ${piece} at ${slugify(title)}.md`)
		}
	},
}

export default command
