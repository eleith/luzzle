import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import slugify from '@sindresorhus/slugify'
import yaml from 'yaml'

export type CreateArgv = {
	piece: string
	title: string
	fields?: string[]
	input: string
	minimal?: boolean
}

function parseFields(fields: string[], input: string): Record<string, unknown> {
	switch (input) {
		case 'json':
			return JSON.parse(fields[0])
		case 'yaml':
			return yaml.parse(fields[0])
		case 'csv':
		default:
			return fields
				.join('')
				.split(',')
				.reduce(
					(fields, field) => {
						const [fieldname, value] = field.split('=').map((f) => f.trim())
						fields[fieldname] = value
						return fields
					},
					{} as Record<string, unknown>
				)
	}
}

const command: Command<CreateArgv> = {
	name: 'create',

	command: `create <title> [fields..]`,

	describe: 'create a new piece',

	builder: <T>(yargs: Argv<T>) => {
		return yargs
			.option('piece', {
				type: 'string',
				alias: 'p',
				description: `piece type`,
				demandOption: `piece is required`,
			})
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
			.option('input', {
				alias: 'i',
				type: 'string',
				choices: ['csv', 'json', 'yaml'],
				default: 'csv',
				description: 'input format of the fields positional',
			})
			.positional('fields', {
				type: 'string',
				array: true,
				description: 'field(s) or field(s) and value(s)',
			}) as Argv<T & CreateArgv>
	},

	run: async function (ctx, args) {
		const { title, piece, fields, input, minimal } = args
		const pieces = await ctx.pieces.getPiece(args.piece)
		const slug = slugify(title)

		if (pieces.exists(slug)) {
			log.error(`${piece} already exists at ${pieces.getFileName(slug)}`)
			return
		}

		if (ctx.flags.dryRun === false) {
			const markdown = pieces.create(slug, title, minimal)

			if (fields?.length) {
				const fieldMaps = parseFields(fields, input)
				const updatedMarkdown = await pieces.setFields(markdown, fieldMaps)
				await pieces.write(updatedMarkdown)
			} else {
				await pieces.write(markdown)
			}

			log.info(`created new ${piece} at ${pieces.getFileName(slug)}`)
		} else {
			log.info(`created new ${piece} at ${slugify(title)}.md`)
		}
	},
}

export default command
