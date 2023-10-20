import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { eachLimit } from 'async'

export type ProcessArgv = { force: boolean }

const command: Command<ProcessArgv> = {
	name: 'process',

	command: 'process',

	describe: 'process files',

	builder: <T>(yargs: Argv<T>) => {
		return yargs.options('force', {
			type: 'boolean',
			alias: 'f',
			description: 'force updates on all items',
			default: false,
		})
	},

	run: async function (ctx, args) {
		const force = args.force
		const dryRun = ctx.flags.dryRun
		const pieceTypes = ctx.pieces.getPieceTypes()

		await eachLimit(pieceTypes, 1, async (pieceType) => {
			const pieces = await ctx.pieces.getPiece(pieceType)
			const slugs = await pieces.getSlugs()
			const updatedSlugs = force ? slugs : await pieces.filterSlugsBy(slugs, 'lastProcessed')
			await pieces.process(updatedSlugs, dryRun)
		})
	},
}

export default command
