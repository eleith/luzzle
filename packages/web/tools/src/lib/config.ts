import path from 'path'
import { existsSync } from 'fs'
import { Config } from '@luzzle/web.utils'
import { loadConfig } from '@luzzle/web.utils/server'

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
