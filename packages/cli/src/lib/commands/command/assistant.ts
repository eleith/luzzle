import { Argv } from 'yargs'
import { Command } from '../utils/types.js'
import yaml from 'yaml'
import { PieceArgv, makePieceOption, parsePieceOptionArgv } from '../../pieces/index.js'
import { pieceFrontMatterFromPrompt } from '../../llm/google.js'

export type AssistantArgv = {
	update?: string
	directory?: string
	prompt: string
	file?: string
	title?: string
} & PieceArgv

const command: Command<AssistantArgv> = {
	name: 'assistant',

	command: `assistant`,

	describe: 'prompt an assistant to generate a piece',

	builder: function <T>(yargs: Argv<T>) {
		return makePieceOption(yargs)
			.option('update', {
				alias: 'u',
				type: 'string',
				description: 'file path to an existing piece',
			})
			.option('directory', {
				alias: 'd',
				type: 'string',
				description: 'dir to where you want to create the piece',
			})
			.option('title', {
				type: 'string',
				description: 'title of the piece you want to create',
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
		const { prompt, file, update, directory, title } = args
		const { piece } = await parsePieceOptionArgv(ctx, args)
		const apiKey = ctx.config.get('api_keys.google', '')
		const metadata = await pieceFrontMatterFromPrompt(apiKey, piece.schema, prompt, file)

		if (update && directory) {
			throw new Error(`update and directory are mutually exclusive`)
		}

		if (update && title) {
			throw new Error(`title is only to be used when creating a new piece`)
		}

		if (directory && !title) {
			throw new Error(`title is required when creating a new piece`)
		}

		if (update) {
			const markdown = await piece.get(update)
			const markdownUpdate = await piece.setFields(markdown, metadata)
			await piece.write(markdownUpdate)
		
			console.log(yaml.stringify(markdownUpdate.frontmatter))
		} else if (directory && title) {
			const markdown = await piece.create(directory, title)
			const markdownUpdate = await piece.setFields(markdown, metadata)
			await piece.write(markdownUpdate)

			console.log(yaml.stringify(markdownUpdate.frontmatter))
		} else {
			console.log(yaml.stringify(metadata))
		}
	},
}

export default command
