import { Command } from './utils/types.js'
import { eachLimit } from 'async'

const command: Command = {
	name: 'dump',

	command: 'dump',

	describe: 'dump database to local markdown files',

	run: async function (ctx) {
		const dryRun = ctx.flags.dryRun
		const pieceTypes = ctx.pieces.getPieceTypes()

		await eachLimit(pieceTypes, 1, async (pieceType) => {
			const pieces = await ctx.pieces.getPiece(pieceType)
			await pieces.dump(ctx.db, dryRun)
		})
	},
}

export default command
