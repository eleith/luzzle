import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import {
	PieceArgv,
	PieceCommandOption,
	PieceMarkdownError,
	makePieceCommand,
	parsePieceArgv,
} from '../pieces/index.js'
import yaml from 'yaml'

export type FieldArgv = {
	remove?: boolean
	set?: boolean
	fields?: string
	input: string
} & PieceArgv

function parseSimpleField(field: string): Record<string, unknown> {
	const parts = field.split('=')
	return { [parts[0]]: parts[1] }
}

async function parseFields(fields: string, input: string): Promise<Record<string, unknown>> {
	switch (input) {
		case 'json':
			return JSON.parse(fields)
		case 'yaml':
			return yaml.parse(fields)
		case 'simple':
		default:
			return parseSimpleField(fields)
	}
}

const command: Command<FieldArgv> = {
	name: 'field',

	command: `field ${PieceCommandOption} [fields]`,

	describe: 'get, edit or remove a field',

	builder: function <T>(yargs: Argv<T>) {
		return makePieceCommand(yargs)
			.option('remove', {
				alias: 'r',
				type: 'boolean',
				default: false,
				description: 'remove the field',
			})
			.option('set', {
				alias: 's',
				type: 'boolean',
				default: false,
				description: 'set the field to the value',
			})
			.option('input', {
				alias: 'i',
				type: 'string',
				choices: ['simple', 'json', 'yaml'],
				default: 'simple',
				description: 'input format of the fields positional',
			})
			.positional('fields', {
				type: 'string',
				description: 'field to set or remove',
			})
	},

	run: async function (ctx, args) {
		const { fields, remove, set, input } = args
		const { slug, name } = await parsePieceArgv(ctx, args)
		const piece = await ctx.pieces.getPiece(name)
		const pieceFields = piece.fields.map((f) => f.name)
		const fieldMaps = fields?.length ? await parseFields(fields, input) : undefined
		const fieldnames = Object.keys(fieldMaps || {})

		if (!fieldMaps) {
			if (set) {
				log.error('must provide a fieldname to set a field')
				return
			} else if (remove) {
				log.error('must provide a fieldname to remove a field')
				return
			} else {
				console.log(`valid fields for ${name} are: ${pieceFields.join(', ')}`)
				return
			}
		}

		const markdown = await piece.get(slug)
		const pieceField = fieldnames.find((f) => !pieceFields.includes(f))

		if (pieceField) {
			log.error(`'${pieceField}' is not a valid field for ${piece} types`)
			return
		}

		if (!markdown) {
			log.error(`${slug} was not found`)
			return
		}

		if (set && remove) {
			log.error('cannot set and remove a field at the same time')
			return
		} else if (set) {
			try {
				const updated = await piece.setFields(markdown, fieldMaps)

				if (!ctx.flags.dryRun) {
					await piece.write(updated)
				}

				log.info(`saved: ${fields}`)
			} catch (e) {
				/* c8 ignore next 2 */
				const errors = e instanceof PieceMarkdownError ? piece.getErrors(e) : [e]
				log.error(`error setting field: ${errors.join(', ')}`)
			}
		} else if (remove) {
			try {
				const updated = await piece.removeFields(markdown, fieldnames)

				if (!ctx.flags.dryRun) {
					await piece.write(updated)
				}

				log.info(`removed: ${fieldnames.join(', ')}`)
			} catch (e) {
				/* c8 ignore next 2 */
				const errors = e instanceof PieceMarkdownError ? piece.getErrors(e) : [e]
				log.error(`error setting field: ${errors.join(', ')}`)
			}
		} else {
			//console.log(`fields: ${fieldnames.map((f) => `${f}=${markdown.frontmatter[f]}`).join('\n')}`)
			console.log(`${fieldnames.map((f) => `${markdown.frontmatter[f]}`).join('\n')}`)
		}
	},
}

export default command
