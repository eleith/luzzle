import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.options({
			db: {
				type: 'string',
				description: 'path to luzzle sqlite',
				demandOption: true,
				alias: 'sqlite',
			},
			in: {
				type: 'string',
				description: 'path to luzzle directory',
				demandOption: true,
				alias: 'luzzle',
			},
			out: {
				type: 'string',
				description: 'path to luzzle images directory',
				demandOption: true,
				alias: 'images',
			},
			font: {
				type: 'string',
				description: 'path to luzzle font file',
				demandOption: true,
				alias: 'font',
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
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
