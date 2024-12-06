import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import {
	PieceArgv,
	makePiecePathPositional,
	PiecePositional,
	parsePiecePathPositionalArgv,
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

	command: `field ${PiecePositional} [fields]`,

	describe: 'get, edit or remove a field',

	builder: function <T>(yargs: Argv<T>) {
		return makePiecePathPositional(yargs)
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
		const { piece, markdown } = await parsePiecePathPositionalArgv(ctx, args)
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
				console.log(`valid fields for ${piece.type} are: ${pieceFields.join(', ')}`)
				return
			}
		}

		const pieceField = fieldnames.find((f) => !pieceFields.includes(f))

		if (pieceField) {
			log.error(`'${pieceField}' is not a valid field for ${piece} types`)
			return
		}

		if (set && remove) {
			log.error('cannot set and remove a field at the same time')
			return
		} else if (set || remove) {
			const updated = set
				? await piece.setFields(markdown, fieldMaps)
				: await piece.removeFields(markdown, fieldnames)

			if (!ctx.flags.dryRun) {
				await piece.write(updated)
				log.info(`modified: ${fields}`)
			} else {
				const validate = piece.validate(updated)
				if (!validate.isValid) {
					log.error(`field errors:\n${validate.errors}`)
				} else {
					log.info(`modified: ${fields}`)
				}
			}
		} else {
			//console.log(`fields: ${fieldnames.map((f) => `${f}=${markdown.frontmatter[f]}`).join('\n')}`)
			console.log(`${fieldnames.map((f) => `${markdown.frontmatter[f]}`).join('\n')}`)
		}
	},
}

export default command
