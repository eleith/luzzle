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

export { type Command, type Context }
export default getCommands
