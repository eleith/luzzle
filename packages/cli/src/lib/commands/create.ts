import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import slugify from '@sindresorhus/slugify'
import yaml from 'yaml'
import path from 'path'
import { PieceArgv, PieceFileType, makePieceOption, parsePieceOptionArgv } from '../pieces/index.js'
import { existsSync } from 'fs'

export type CreateArgv = {
	title: string
	fields?: string[]
	input: string
	minimal?: boolean
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
			.option('minimal', {
				type: 'boolean',
				alias: 'm',
				description: `create a minimal piece with only required pieces`,
				default: false,
			})
			.positional('title', {
				type: 'string',
				description: `title of piece`,
				demandOption: `title is required`,
			})
			.option('directory', {
				alias: 'd',
				type: 'string',
				description: 'dir to where to make the piece',
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
		const { title, fields, input, minimal, directory } = args
		const { piece } = await parsePieceOptionArgv(ctx, args)
		const slug = slugify(title)
		const dir = path.resolve(directory)
		const filePath = path.join(dir, `${slug}.${piece.type}.${PieceFileType}`)
		const file = path.relative(ctx.directory, filePath)

		if (existsSync(filePath)) {
			log.error(`file already exists at ${filePath}`)
			return
		}

		if (ctx.flags.dryRun === false) {
			const markdown = piece.create(file, title, minimal)

			if (fields?.length) {
				const fieldMaps = parseFields(fields, input)
				const updatedMarkdown = await piece.setFields(markdown, fieldMaps)
				await piece.write(updatedMarkdown)
			} else {
				await piece.write(markdown)
			}

			log.info(`created new ${piece} at ${filePath}`)
		} else {
			log.info(`created new ${piece} at ${filePath}`)
		}
	},
}

export default command
