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
			url: {
				type: 'string',
				description: 'the site url',
				demandOption: true,
			},
			title: {
				type: 'string',
				description: 'the site title',
				default: 'luzzle feed',
			},
			description: {
				type: 'string',
				description: 'the site description',
				default: 'luzzle feed',
			},
			output: {
				type: 'string',
				description: 'output folder',
				default: './',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
