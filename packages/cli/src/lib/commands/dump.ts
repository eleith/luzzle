import { Command } from './utils/types.js'

const command: Command = {
	name: 'dump',

	command: 'dump',

	describe: 'dump database to local markdown files',

	run: async function (ctx) {
		const dryRun = ctx.flags.dryRun
		const pieceNames = await ctx.pieces.getTypes()

		for (const name of pieceNames) {
			const piece = ctx.pieces.getPiece(name)
			await piece.dump(ctx.db, dryRun)
		}
	},
}

export default command
