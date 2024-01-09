import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { eachLimit } from 'async'
import {
	makeOptionalPieceCommand,
	parseOptionalPieceArgv,
	PieceOptionalArgv,
	PieceOptionalCommandOption,
} from '../pieces/index.js'

export type SyncArgv = { force: boolean } & PieceOptionalArgv

const command: Command<SyncArgv> = {
	name: 'sync',

	command: `sync ${PieceOptionalCommandOption}`,

	describe: 'sync directory to local database',

	builder: <T>(yargs: Argv<T>) => {
		return makeOptionalPieceCommand(yargs).options('force', {
			type: 'boolean',
			alias: 'f',
			description: 'force updates on all items',
			default: false,
		})
	},

	run: async function (ctx, args) {
		const force = args.force
		const dryRun = ctx.flags.dryRun
		const optionalPiece = parseOptionalPieceArgv(args)
		const pieceTypes = optionalPiece ? [optionalPiece.piece] : ctx.pieces.getPieceTypes()

		await eachLimit(pieceTypes, 1, async (pieceType) => {
			const pieces = await ctx.pieces.getPiece(pieceType)
			const slugs = []

			if (optionalPiece?.slug) {
				slugs.push(optionalPiece.slug)
			} else {
				const allSlugs = await pieces.getSlugs()
				const updatedSlugs = await pieces.filterSlugsBy(allSlugs, 'lastSynced')
				const processSlugs = force ? allSlugs : updatedSlugs

				slugs.push(...processSlugs)
			}

			await pieces.sync(ctx.db, slugs, dryRun)

			if (!optionalPiece) {
				await pieces.syncCleanUp(ctx.db, dryRun)
			}
		})
	},
}

export default command
