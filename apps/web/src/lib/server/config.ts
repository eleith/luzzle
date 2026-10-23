import { type ConfigPublic } from '@luzzle/web.config'
import { loadConfig, type TemplateConfig } from '@luzzle/web.templates/config'
import * as path from 'path'
import { existsSync } from 'fs'

export type AppConfig = TemplateConfig
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
