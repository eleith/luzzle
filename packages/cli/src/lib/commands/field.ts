import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import { PieceArgv, PieceCommandOption, makePieceCommand, parsePieceArgv } from '../pieces/index.js'

export type AttachArgv = {
	fieldname?: string
	value?: string
	remove?: boolean
	set?: boolean
} & PieceArgv

const command: Command<AttachArgv> = {
	name: 'field',

	command: `field ${PieceCommandOption} [fieldname] [value]`,

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
			.positional('fieldname', {
				type: 'string',
				description: 'name of field to edit',
			})
			.positional('value', {
				type: 'string',
				description: 'value to set corresponding to field to',
			})
	},

	run: async function (ctx, args) {
		const { slug, piece } = parsePieceArgv(args)
		const { fieldname, value, remove, set } = args
		const pieces = ctx.pieces.getPiece(piece)

		if (!fieldname) {
			if (set) {
				log.error('must provide a fieldname to set a field')
				return
			} else if (remove) {
				log.error('must provide a fieldname to remove a field')
				return
			} else {
				const fields = pieces.fields.map((f) => f.name).join(', ')
				console.log(`valid fields for ${piece} are: ${fields}`)
				return
			}
		}

		const markdown = await pieces.get(slug)
		const pieceField = pieces.fields.find((pf) => pf.name === fieldname)

		if (!pieceField) {
			log.error(`'${fieldname}' is not a valid field for ${piece} types`)
			return
		}

		if (!markdown) {
			log.error(`${slug} was not found`)
			return
		}

		const field = fieldname as keyof (typeof markdown)['frontmatter']

		if (set && remove) {
			log.error('cannot set and remove a field at the same time')
			return
		} else if (set) {
			if (value !== undefined) {
				const updated = await pieces.setField(markdown, field, value)

				if (!ctx.flags.dryRun) {
					await pieces.write(updated)
				}

				log.info(`${field} is now ${value}`)
			} else {
				log.error('must provide a value to set a field')
				return
			}
		} else if (remove) {
			if (value === undefined) {
				const updated = await pieces.removeField(markdown, field)

				if (!ctx.flags.dryRun) {
					await pieces.write(updated)
				}

				log.info(`removed ${field} in ${slug}`)
			} else {
				log.error('cannot remove a field while tryign to set it')
				return
			}
		} else {
			console.log(markdown.frontmatter[field])
		}
	},
}

export default command
