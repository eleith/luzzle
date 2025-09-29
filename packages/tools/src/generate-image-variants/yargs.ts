/* v8 ignore start */
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
				type: 'number',
				description: 'width to resize to',
				default: 350,
			},
			field: {
				type: 'string',
				description: 'piece field to create the variant image for',
				demandOption: true,
			},
		})
		.help()
		.check((argv) => {
			if (argv.size <= 0 || isNaN(argv.size) || argv.size > 4000) {
				throw new Error('size must be a positive number')
			}
			return true
		})
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
/* v8 ignore stop */
