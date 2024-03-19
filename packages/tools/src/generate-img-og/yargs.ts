import { Piece } from '@luzzle/core'
import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			database: {
				type: 'string',
				description: 'luzzle sqlite file path',
				demandOption: true,
			},
			type: {
				type: 'string',
				description: 'type of piece',
				enum: Object.values(Piece),
			},
			input: {
				type: 'string',
				description: 'the directory to assets',
				demandOption: true,
			},
			output: {
				type: 'string',
				description: 'the directory to output the og images',
				demandOption: true,
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
