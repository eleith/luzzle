import { type Config, type ConfigPublic } from '@luzzle/web.utils'
import { loadConfig } from '@luzzle/web.utils/server'
import * as path from 'path'
import { existsSync } from 'fs'

export type AppConfig = Config
export type AppConfigPublic = ConfigPublic

let cachedConfig: AppConfig | null = null

function findUserConfigPath(): string | undefined {
	const configPath = path.join(process.cwd(), 'config.yaml')

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
