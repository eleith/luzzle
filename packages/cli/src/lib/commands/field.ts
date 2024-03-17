import log from '../log.js'
import { Argv } from 'yargs'
import { Command } from './utils/types.js'
import { PieceArgv, PieceCommandOption, makePieceCommand, parsePieceArgv } from '../pieces/index.js'

export type AttachArgv = {
	fieldname?: string
	value?: string
	remove?: boolean
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
		const { fieldname, value, remove } = args
		const pieces = ctx.pieces.getPiece(piece)
		const markdown = await pieces.get(slug)

		if (!markdown) {
			log.error(`${slug} was not found`)
			return
		}

		const pieceField = pieces.fields.find((pf) => pf.name === fieldname)
		const field = fieldname as keyof (typeof markdown)['frontmatter']

		if (!fieldname) {
			const fields = pieces.fields.map((f) => f.name).join(', ')
			console.log(`valid fields for ${piece} are: ${fields}`)
			return
		}

		if (!pieceField) {
			log.error(`'${field}' is not a valid field for ${piece} types`)
			return
		}

		if (remove && value !== undefined) {
			log.error('cannot set a field while removing it')
			return
		}

		if (remove) {
			const updated = await pieces.removeField(markdown, field)

			if (!ctx.flags.dryRun) {
				await pieces.write(updated)
			}

			log.info(`removed ${field} in ${slug}`)
		} else if (value !== undefined) {
			const updated = await pieces.editField(markdown, field, value)

			if (!ctx.flags.dryRun) {
				await pieces.write(updated)
			}

			log.info(`${field} is now ${value}`)
		} else {
			console.log(markdown.frontmatter[field])
		}
	},
}

export default command
