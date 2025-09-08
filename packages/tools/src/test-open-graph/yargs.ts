import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.options({
			luzzle: {
				type: 'string',
				description: 'path to the luzzle root',
				demandOption: true,
			},
			out: {
				type: 'string',
				description: 'path to luzzle images directory',
				alias: 'images',
			},
			piece: {
				type: 'string',
				description: 'slug of the piece to generate images for',
				alias: 'p',
			},
			force: {
				type: 'boolean',
				description: 'force regeneration of images',
				default: false,
				alias: 'f',
			},
			format: {
				type: 'string',
				description: 'output file type',
				alias: 'o',
				default: 'html',
				choices: ['png', 'svg', 'html'],
			},
			templates: {
				type: 'string',
				description: 'path to templates folder',
				alias: 't',
				demandOption: true,
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
