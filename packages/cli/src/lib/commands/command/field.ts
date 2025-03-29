import log from '../../log.js'
import { Argv } from 'yargs'
import { Command } from '../utils/types.js'
import {
	PieceArgv,
	makePiecePathPositional,
	PiecePositional,
	parsePiecePathPositionalArgv,
} from '../../pieces/index.js'
import yaml from 'yaml'

export type FieldArgv = {
	remove?: boolean
	field?: string
	value?: string
	append?: boolean
} & PieceArgv

const command: Command<FieldArgv> = {
	name: 'field',

	command: `field ${PiecePositional} [field] [value]`,

	describe: 'get, edit or remove a field',

	builder: function <T>(yargs: Argv<T>) {
		return makePiecePathPositional(yargs)
			.option('remove', {
				alias: 'r',
				type: 'boolean',
				default: false,
				description: 'remove the field',
			})
			.option('append', {
				alias: 'a',
				type: 'boolean',
				default: false,
				description: 'append to the field',
			})
			.positional('field', {
				type: 'string',
				description: 'field to set or remove',
			})
			.positional('value', {
				type: 'string',
				description: 'field value to set',
			})
	},

	run: async function(ctx, args) {
		const { field, remove, value, append } = args
		const { piece, markdown } = await parsePiecePathPositionalArgv(ctx, args)
		const pieceFields = piece.fields.map((f) => f.name)

		if (!field) {
			if (remove) {
				log.error('must provide a fieldname to remove a field')
				return
			} else {
				const emptyFields = pieceFields.reduce(
					(acc, f) => ({ ...acc, [f]: '' }),
					{} as Record<string, string>
				)
				const yamlFields = yaml.stringify({ ...emptyFields, ...markdown.frontmatter })
				console.log(yamlFields)
				return
			}
		}

		if (!pieceFields.includes(field)) {
			log.error(`'${field}' is not a valid field for ${piece} types`)
			return
		}

		if (remove) {
			const updated = await piece.removeField(markdown, field, value)

			if (!ctx.flags.dryRun) {
				await piece.write(updated)
				log.info(`removed: ${field}`)
			} else {
				const validate = piece.validate(updated)

				if (!validate.isValid) {
					log.error(`field errors:\n${validate.errors}`)
				} else {
					log.info(`removed: ${field}`)
				}
			}
		} else if (value) {
			const current = markdown.frontmatter[field]
			const updated = await piece.setField(markdown, field, append && Array.isArray(current) ? [...current, value] : value)

			if (!ctx.flags.dryRun) {
				await piece.write(updated)
				console.log(updated.frontmatter[field])
			} else {
				const validate = piece.validate(updated)

				if (!validate.isValid) {
					log.error(`field errors:\n${validate.errors}`)
				} else {
					console.log(updated.frontmatter[field])
				}
			}
		} else {
			console.log(markdown.frontmatter[field])
		}
	},
}

export default command
