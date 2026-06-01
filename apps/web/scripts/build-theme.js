import { generateThemeCss } from '@luzzle/web.theme'
import { loadConfig } from '@luzzle/web.config'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

function resolveConfigPath(configPath) {
	const resolved = configPath
		? path.resolve(configPath)
		: path.resolve(process.cwd(), 'config.yaml')
	if (!existsSync(resolved)) {
		throw new Error(
			`Config file not found at ${resolved}. Provide a path argument or create a config.yaml in the current directory.`
		)
	}
	return resolved
}

const isEntrypoint =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isEntrypoint) {
	try {
		const configPath = resolveConfigPath(process.argv[2])
		const config = loadConfig(configPath)
		process.stdout.write(generateThemeCss(config))
	} catch (err) {
		console.error(err instanceof Error ? err.message : err)
		process.exit(1)
	}
}
