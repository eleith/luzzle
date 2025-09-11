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
			file: {
				type: 'string',
				description: 'file of piece to generate image variants for',
				demandOption: true,
			},
			format: {
				description: 'variant image formats to create',
				type: 'string',
				default: 'avif',
				choices: ['avif', 'jpg'],
			},
			size: {
				type: 'string',
				description: 'image sizes to create',
				default: 'medium',
				choices: ['small', 'medium', 'large', 'xl'],
			},
			field: {
				type: 'string',
				description: 'piece field to create the variant image for',
				demandOption: true,
			}
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
