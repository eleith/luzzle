import { Command } from './utils/types.js'
import { Argv } from 'yargs'

export type SyncArgv = { force?: boolean }

const command: Command<SyncArgv> = {
	name: 'sync',

	command: `sync`,

	describe: 'sync directory to local database',

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
		const pieceNames = await ctx.pieces.getTypes()
		const allFiles = await ctx.pieces.getFiles()

		for (const name of pieceNames) {
			const piece = ctx.pieces.getPiece(name)
			const allPieces = allFiles.filter((file) => ctx.pieces.getTypeFromFile(file) === name)
			const isOutdated = await Promise.all(allPieces.map((file) => piece.isOutdated(file, ctx.db)))
			const areOutdated = allPieces.filter((_, i) => isOutdated[i])
			const processFiles = force ? allPieces : areOutdated

			await piece.sync(ctx.db, dryRun)
			await piece.syncItems(ctx.db, processFiles, dryRun)
			await piece.syncItemsCleanUp(ctx.db, allPieces, dryRun)
		}
	},
}

export default command
