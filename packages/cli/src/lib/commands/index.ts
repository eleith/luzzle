import path from 'path'
import { Command, Context } from './utils/types.js'
import { readdir } from 'fs/promises'

async function getCommands() {
	const commandPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'command')
	const files = await readdir(commandPath)
	const commands: { [key: string]: Command } = {}

	for (const file of files) {
		if (file.endsWith('.js')) {
			const name = file.replace(/\..+$/, '')
			/* c8 ignore next 3 */
			const ext = process.env.NODE_ENV === 'test' ? 'ts' : 'js'
			const command = await import(`./command/${name}.${ext}`)
			commands[name] = command.default as Command
		}
	}

	return commands
}

/*
import assistant from './command/assistant.js'
import field from './command/field.js'
import config from './command/config.js'
import validate from './command/validate.js'
import create from './command/create.js'
import sync from './command/sync.js'
import init from './command/init.js'

async function getCommands() {
	return {
		assistant,
		field,
		config,
		validate,
		create,
		sync,
		init
	} as unknown as { [key: string]: Command }
}
*/

export { type Command, type Context }
export default getCommands
