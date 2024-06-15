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

export type AttachArgv = {
	remove?: boolean
	set?: boolean
	fields?: string[]
} & PieceArgv

const command: Command<AttachArgv> = {
	name: 'field',

	command: `field ${PieceCommandOption} [fields..]`,

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
			.positional('fields', {
				type: 'string',
				array: true,
				description: 'pairs of field=value to optionally set or list of fields to remove',
			})
	},

	run: async function (ctx, args) {
		const { slug, piece } = parsePieceArgv(args)
		const { fields, remove, set } = args
		const pieces = ctx.pieces.getPiece(piece)
		const pieceFields = pieces.fields.map((f) => f.name)
		const fieldMaps = fields?.reduce(
			(fields, field) => {
				const [fieldname, value] = field.split('=')
				fields[fieldname] = value
				return fields
			},
			{} as Record<string, unknown>
		)
		const fieldnames = fieldMaps ? Object.keys(fieldMaps) : []

		if (!fieldMaps || !fieldnames.length) {
			if (set) {
				log.error('must provide a fieldname to set a field')
				return
			} else if (remove) {
				log.error('must provide a fieldname to remove a field')
				return
			} else {
				console.log(`valid fields for ${piece} are: ${pieceFields.join(', ')}`)
				return
			}
		}

		const markdown = await pieces.get(slug)
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
				const updated = await pieces.setFields(markdown, fieldMaps)

				if (!ctx.flags.dryRun) {
					await pieces.write(updated)
				}

				log.info(`saved: ${fields}`)
			} catch (e) {
				/* c8 ignore next 2 */
				const errors = e instanceof PieceMarkdownError ? pieces.getErrors(e) : [e]
				log.error(`error setting field: ${errors.join(', ')}`)
			}
		} else if (remove) {
			try {
				const fieldnames = Object.keys(fieldMaps)
				const updated = await pieces.removeFields(markdown, fieldnames)

				if (!ctx.flags.dryRun) {
					await pieces.write(updated)
				}

				log.info(`removed: ${fieldnames.join(', ')}`)
			} catch (e) {
				/* c8 ignore next 2 */
				const errors = e instanceof PieceMarkdownError ? pieces.getErrors(e) : [e]
				log.error(`error setting field: ${errors.join(', ')}`)
			}
		} else {
			const fieldnames = Object.keys(fieldMaps)
			console.log(`fields: ${fieldnames.map((f) => `${f}=${markdown.frontmatter[f]}`).join('\n')}`)
		}
	},
}

export default command
