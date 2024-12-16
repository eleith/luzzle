import { selectItemAssets } from '@luzzle/core'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import path from 'path'
import { unlink } from 'fs/promises'

export type SyncArgv = { force?: boolean; prune?: boolean }

const command: Command<SyncArgv> = {
	name: 'sync',

	command: `sync`,

	describe: 'sync directory to local database',

	builder: <T>(yargs: Argv<T>) => {
		return yargs
			.option('force', {
				type: 'boolean',
				alias: 'f',
				description: 'force updates on all items',
				default: false,
			})
			.option('prune', {
				type: 'boolean',
				alias: 'p',
				description: 'prune unneeded assets from disk',
				default: false,
			})
	},

	run: async function (ctx, args) {
		const { force, prune } = args
		const dryRun = ctx.flags.dryRun
		const files = await ctx.pieces.getFiles()

		// sync new/removed types with db
		const pieceNames = await ctx.pieces.sync(ctx.db, dryRun)
		await ctx.pieces.prune(ctx.db, dryRun)

		for (const name of pieceNames) {
			const piece = ctx.pieces.getPiece(name)
			const pieces = files.pieces[name]
			const isOutdated = await Promise.all(pieces.map((file) => piece.isOutdated(file, ctx.db)))
			const areOutdated = pieces.filter((_, i) => isOutdated[i])
			const processFiles = force ? pieces : areOutdated

			// sync new/removed pieces with db
			await piece.sync(ctx.db, processFiles, dryRun)
			await piece.prune(ctx.db, pieces, dryRun)
		}

		// prune unneeded assets from disk
		if (prune) {
			const dbAssets = await selectItemAssets(ctx.db)
			const dbAssetsSet = new Set<string>(dbAssets)
			const missingAssets = files.assets.filter((asset) => !dbAssetsSet.has(asset))

			for (const asset of missingAssets) {
				if (!dryRun) {
					const assetPath = path.join(ctx.pieces.directory, asset)
					await unlink(assetPath)
				}
				ctx.log.info(`pruned asset (disk): ${asset}`)
			}
		}
	},
}

export default command
