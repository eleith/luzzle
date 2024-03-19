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
			input: {
				type: 'string',
				description: 'input folder path',
				demandOption: true,
			},
			type: {
				type: 'string',
				description: 'type of piece',
				enum: Object.values(Piece),
			},
			output: {
				type: 'string',
				description: 'output folder',
				default: './',
			},
			variant: {
				type: 'string',
				description: 'variant type',
				choices: ['width', 'height'],
				default: 'width',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
