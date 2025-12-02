import { selectItemAssets } from '@luzzle/core'
import { type Command } from '../utils/types.js'
import { Argv } from 'yargs'

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

	run: async function(ctx, args) {
		const { force, prune } = args
		const { dryRun } = ctx.flags
		const files = await ctx.pieces.getFilesIn('.', { deep: true })

		if (dryRun) {
			const schemaPlan = await ctx.pieces.getSyncOperations(ctx.db)
			if (schemaPlan.toAdd.length > 0)
				ctx.log.info(`Schemas to add: ${schemaPlan.toAdd.map((p) => p.name).join(', ')}`)
			if (schemaPlan.toUpdate.length > 0)
				ctx.log.info(`Schemas to update: ${schemaPlan.toUpdate.map((p) => p.name).join(', ')}`)

			const prunableTypes = await ctx.pieces.getPruneOperations(ctx.db)
			if (prunableTypes.length > 0)
				ctx.log.info(`Piece types to prune: ${prunableTypes.join(', ')}`)

			for (const name of files.types) {
				const piece = await ctx.pieces.getPiece(name)
				const piecesOnDisk = files.pieces.filter(
					(one) => ctx.pieces.parseFilename(one).type === name
				)
				const isOutdated = await Promise.all(
					piecesOnDisk.map((file) => piece.isOutdated(file, ctx.db))
				)
				const areOutdated = piecesOnDisk.filter((_, i) => isOutdated[i])
				const processFiles = force ? piecesOnDisk : areOutdated

				const markdownPlan = await piece.getSyncOperations(ctx.db, processFiles)
				if (markdownPlan.toAdd.length > 0)
					ctx.log.info(
						`Piece '${name}': Items to add: ${markdownPlan.toAdd.map((m) => m.filePath).join(', ')}`
					)
				if (markdownPlan.toUpdate.length > 0)
					ctx.log.info(
						`Piece '${name}': Items to update: ${markdownPlan.toUpdate.map((m) => m.filePath).join(', ')}`
					)

				const prunableItems = await piece.getPruneOperations(ctx.db, piecesOnDisk)
				if (prunableItems.length > 0)
					ctx.log.info(`Piece '${name}': Items to prune: ${prunableItems.join(', ')}`)
			}

			if (prune) {
				const dbAssets = await selectItemAssets(ctx.db)
				const dbAssetsSet = new Set<string>(dbAssets)
				const missingAssets = files.assets.filter((asset) => !dbAssetsSet.has(asset))
				if (missingAssets.length > 0)
					ctx.log.info(`Assets to prune from disk: ${missingAssets.join(', ')}`)
			}
		} else {
			ctx.log.info('--- Starting normal run. Changes will be made. ---')

			await ctx.pieces.sync(ctx.db)
			await ctx.pieces.prune(ctx.db)

			for (const name of files.types) {
				const piece = await ctx.pieces.getPiece(name)
				const piecesOnDisk = files.pieces.filter(
					(one) => ctx.pieces.parseFilename(one).type === name
				)
				const isOutdated = await Promise.all(
					piecesOnDisk.map((file) => piece.isOutdated(file, ctx.db))
				)
				const areOutdated = piecesOnDisk.filter((_, i) => isOutdated[i])
				const processFiles = force ? piecesOnDisk : areOutdated

				await piece.sync(ctx.db, processFiles)
				await piece.prune(ctx.db, piecesOnDisk)
			}

			if (prune) {
				const dbAssets = await selectItemAssets(ctx.db)
				const dbAssetsSet = new Set<string>(dbAssets)
				const missingAssets = files.assets.filter((asset) => !dbAssetsSet.has(asset))

				for (const asset of missingAssets) {
					await ctx.storage.delete(asset)
					ctx.log.info(`pruned asset (disk): ${asset}`)
				}
			}
		}
	},
}

export default command
