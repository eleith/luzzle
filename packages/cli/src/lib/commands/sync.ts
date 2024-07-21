import { deletePiece, getPieces } from '@luzzle/core'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import log from '../log.js'

export type SyncArgv = { force?: boolean; piece?: string }

const command: Command<SyncArgv> = {
	name: 'sync',

	command: `sync`,

	describe: 'sync directory to local database',

	builder: <T>(yargs: Argv<T>) => {
		return yargs
			.options('piece', {
				type: 'string',
				alias: 'p',
				description: `specific piece name to sync`,
			})
			.options('force', {
				type: 'boolean',
				alias: 'f',
				description: 'force updates on all items',
				default: false,
			})
	},

	run: async function (ctx, args) {
		const force = args.force
		const dryRun = ctx.flags.dryRun
		const diskPieceNames = await ctx.pieces.findPieceNames()
		const pieceNames = args.piece ? [args.piece] : diskPieceNames

		for (const name of pieceNames) {
			const piece = await ctx.pieces.getPiece(name)
			const slugs = []

			const allSlugs = await piece.getSlugs()
			const updatedSlugs = await piece.getSlugsOutdated(ctx.db)
			const processSlugs = force ? allSlugs : updatedSlugs

			slugs.push(...processSlugs)

			await piece.sync(ctx.db, dryRun)
			await piece.syncItems(ctx.db, slugs, dryRun)
			await piece.syncItemsCleanUp(ctx.db, dryRun)
		}

		const registeredPieces = await getPieces(ctx.db)
		const registeredPieceNames = registeredPieces.map((piece) => piece.name)
		const missingPieceNames = registeredPieceNames.filter((name) => !diskPieceNames.includes(name))

		for (const name of missingPieceNames) {
			await deletePiece(ctx.db, name)
			log.info(`Deleted piece ${name} from the database`)
		}
	},
}

export default command
