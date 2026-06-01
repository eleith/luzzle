import log from '../../log.js'
import { Argv } from 'yargs'
import { Command } from '../utils/types.js'
import yaml from 'yaml'
import { withDefaults } from '../../config.js'

export type ConfigArgv = {
	remove?: boolean
	field?: string
	value?: unknown
}

const command: Command<ConfigArgv> = {
	name: 'config',

	command: `config [field] [value]`,

	describe: 'get, edit or remove a config field',

	builder: function <T>(yargs: Argv<T>) {
		return yargs
			.option('remove', {
				alias: 'r',
				type: 'boolean',
				default: false,
				description: 'remove the field',
			})
			.positional('field', {
				type: 'string',
				description: 'field to set or remove',
			})
			.positional('value', {
				description: 'value to set',
			})
	},

	run: async function (ctx, args) {
		const { field, remove, value } = args

		if (!field) {
			if (remove) {
				log.error('must provide a field to remove')
			} else {
				const store = withDefaults(ctx.config)
				const configYaml = yaml.stringify(store)

				console.log(`path: ${ctx.config.path}`)
				console.log(`--------------\n${configYaml}--------------`)
			}
		} else if (field === 'path') {
			if (remove || value) {
				log.error('cannot set or remove the config path')
			} else {
				console.log(ctx.config.path)
			}
		} else if (value && remove) {
			log.error('cannot set and remove a field at the same time')
		} else if (value) {
			if (!ctx.flags.dryRun) {
				ctx.config.set(field, value)
			}
			log.info(`setting ${field} to ${value}`)
		} else if (remove) {
			if (!ctx.flags.dryRun) {
				ctx.config.delete(field)
			}
			log.info(`removing ${field}`)
		} else {
			const value = ctx.config.get(field)
			console.log(value)
		}
	},
}

export default command
