import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import yaml from 'yaml'
import { PieceArgv, makePieceOption, parsePieceOptionArgv } from '../pieces/index.js'

export type CreateArgv = {
	title: string
	fields?: string[]
	input: string
	directory: string
} & PieceArgv

function parseFields(fields: string[], input: string): Record<string, unknown> {
	switch (input) {
		case 'json':
			return JSON.parse(fields[0])
		case 'yaml':
		default:
			return yaml.parse(fields[0])
	}
}

const command: Command<CreateArgv> = {
	name: 'create',

	command: `create <title> [fields]`,

	describe: 'create a new piece',

	builder: <T>(yargs: Argv<T>) => {
		return makePieceOption(yargs)
			.positional('title', {
				type: 'string',
				description: `title of piece`,
				demandOption: `title is required`,
			})
			.option('directory', {
				alias: 'd',
				type: 'string',
				description: 'dir to where to create the piece',
				demandOption: true,
			})
			.option('input', {
				alias: 'i',
				type: 'string',
				choices: ['json', 'yaml'],
				default: 'yaml',
				description: 'input format of the fields positional',
			})
			.positional('fields', {
				type: 'string',
				description: 'fields',
			}) as Argv<T & CreateArgv>
	},

	run: async function (ctx, args) {
		const { title, fields, input, directory } = args
		const { piece } = await parsePieceOptionArgv(ctx, args)
		const markdown = piece.create(directory, title)

		if (ctx.flags.dryRun === false) {
			if (fields?.length) {
				const fieldMaps = parseFields(fields, input)
				const updatedMarkdown = await piece.setFields(markdown, fieldMaps)
				await piece.write(updatedMarkdown)
			} else {
				await piece.write(markdown)
			}

			log.info(`created new ${piece} at ${markdown.filePath}`)
		} else {
			log.info(`created new ${piece} at ${markdown.filePath}`)
		}
	},
}

export default command
