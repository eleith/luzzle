import path from 'path'
import { existsSync } from 'fs'
import { loadConfig, type Config } from '@luzzle/web.config'

export function getConfig(configPath?: string): Config {
	const resolvedConfigPath = configPath
		? path.resolve(configPath)
		: path.resolve(process.cwd(), 'config.yaml')

	if (!existsSync(resolvedConfigPath)) {
		throw new Error(
			`Config file not found at ${resolvedConfigPath}. Please provide a config file with --config or create a config.yaml in the current directory.`
		)
	}

	return loadConfig(resolvedConfigPath)
}
