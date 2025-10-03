import { loadConfig, type Config, type ConfigPublic } from '@luzzle/tools'
import * as path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

export type AppConfig = Config
export type AppConfigPublic = ConfigPublic

let cachedConfig: AppConfig | null = null

function findUserConfigPath(): string | undefined {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	const projectRoot = path.resolve(__dirname, '../../../../')
	const configPath = path.join(projectRoot, 'config.yaml')

	if (existsSync(configPath)) {
		return configPath
	}

	return undefined
}

function initializeConfig(): AppConfig {
	if (cachedConfig) {
		return cachedConfig
	}

	const userConfigPath = findUserConfigPath()
	cachedConfig = loadConfig(userConfigPath)

	return cachedConfig
}

export const config = initializeConfig()
