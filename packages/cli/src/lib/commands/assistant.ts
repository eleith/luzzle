import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import yaml from 'yaml'
import {
	PieceArgv,
	PiecePositional,
	makePiecePathPositional,
	parsePiecePathPositionalArgv,
} from '../pieces/index.js'
import { generatePieceFrontmatter } from '../llm/google.js'

export type AssistantArgv = {
	output: string
	write?: boolean
	prompt: string
	file?: string
} & PieceArgv

const command: Command<AssistantArgv> = {
	name: 'assistant',

	command: `assistant ${PiecePositional}`,

	describe: 'prompt an assistant to generate a piece',

	builder: function <T>(yargs: Argv<T>) {
		return makePiecePathPositional(yargs)
			.option('output', {
				alias: 'o',
				type: 'string',
				choices: ['json', 'yaml'],
				default: 'yaml',
				description: 'output format',
			})
			.option('write', {
				alias: 'w',
				type: 'boolean',
				description: 'write the generated piece to the existing piece',
				default: false,
			})
			.option('prompt', {
				type: 'string',
				description:
					'a sentence or two explaining what the piece is about and where to find more information about the piece',
				demandOption: true,
			})
			.option('file', {
				type: 'string',
				description: 'path to a pdf or html file associated with the piece',
			})
	},

	run: async function (ctx, args) {
		const { output, prompt, file, write } = args
		const { markdown, piece } = await parsePiecePathPositionalArgv(ctx, args)
		const apiKey = ctx.config.get('api_keys.google') as string
		const metadata = await generatePieceFrontmatter(apiKey, piece.schema, prompt, file)
		const metadataNonEmpty = Object.fromEntries(
			Object.entries(metadata).filter(([, value]) => value !== null || value === '')
		)

		if (write) {
			const markdownCopy = await piece.setFields(markdown, metadataNonEmpty)
			await piece.write(markdownCopy)
		}

		if (output === 'json') {
			console.log(JSON.stringify(metadataNonEmpty, null, 2))
		} else {
			console.log(yaml.stringify(metadataNonEmpty))
		}
	},
}

export default command
