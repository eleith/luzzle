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

		const syncPiecesIterable = await ctx.pieces.sync(ctx.db, { dryRun, force })

		for await (const result of syncPiecesIterable) {
			if (result.error) {
				ctx.log.error(`error syncing piece ${result.name}: ${result.message}`)
			} else if (result.action === 'added' || result.action === 'updated') {
				ctx.log.info(`[${result.action}] piece type: ${result.name}`)
			}
		}

		const prunePiecesIterable = await ctx.pieces.prune(ctx.db, { dryRun })

		for await (const result of prunePiecesIterable) {
			if (result.error) {
				ctx.log.error(`error pruning piece ${result.name}: ${result.message}`)
			} else if (result.action === 'pruned') {
				ctx.log.info(`[${result.action}] piece type: ${result.name}`)
			}
		}

		for (const name of files.types) {
			const piece = await ctx.pieces.getPiece(name)
			const piecesOnDisk = files.pieces.filter((one) => ctx.pieces.parseFilename(one).type === name)
			const isOutdated = await Promise.all(
				piecesOnDisk.map((file) => piece.isOutdated(file, ctx.db))
			)
			const areOutdated = piecesOnDisk.filter((_, i) => isOutdated[i])
			const processFiles = force ? piecesOnDisk : areOutdated

			const syncPieceIterable = await piece.sync(ctx.db, processFiles, { dryRun, force })

			for await (const result of syncPieceIterable) {
				if (result.error) {
					ctx.log.error(`error syncing piece ${result.file}: ${result.message}`)
				} else if (result.action === 'added' || result.action === 'updated') {
					ctx.log.info(`[${result.action}] piece: ${result.file}`)
				} else if (result.action === 'skipped') {
					ctx.log.info(`[${result.action}] piece: ${result.file}`)
				}
			}

			const prunePieceIterable = await piece.prune(ctx.db, piecesOnDisk, { dryRun })

			for await (const result of prunePieceIterable) {
				if (result.error) {
					ctx.log.error(`error pruning piece ${result.file}: ${result.message}`)
				} else if (result.action === 'pruned') {
					ctx.log.info(`[${result.action}] piece: ${result.file}`)
				}
			}
		}

		if (prune) {
			const dbAssets = await selectItemAssets(ctx.db)
			const dbAssetsSet = new Set<string>(dbAssets)
			const missingAssets = files.assets.filter((asset) => !dbAssetsSet.has(asset))

			for (const asset of missingAssets) {
				if (!dryRun) {
					await ctx.storage.delete(asset)
				}
				ctx.log.info(`pruned asset (disk): ${asset}`)
			}
		}
	},
}

export default command
