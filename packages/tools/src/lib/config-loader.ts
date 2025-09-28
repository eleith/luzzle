import { readFileSync, existsSync } from 'fs'
import * as path from 'path'
import { parse as yamlParse } from 'yaml'
import Ajv from 'ajv'
import { deepMerge } from './deep-merge.js'

import { ConfigSchema as AppConfig } from './config/config.schema.js'

type AppConfigPublic = {
	url: Pick<AppConfig['url'], 'app' | 'luzzle_assets' | 'app_assets'>
	text: AppConfig['text']
	theme: Pick<AppConfig['theme'], 'version'>
}

function loadConfig(options?: { userConfigPath?: string }): AppConfig {
	const __dirname = path.dirname(new URL(import.meta.url).pathname)

	const schemaPath = path.resolve(__dirname, 'config/config.schema.json')
	const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))

	const ajv = new Ajv.default()
	const validate = ajv.compile(schema)

	const defaultPath = path.resolve(__dirname, 'config/config.defaults.yaml')
	const defaultConfig = yamlParse(readFileSync(defaultPath, 'utf8')) as Partial<AppConfig>

	let userConfig: Partial<AppConfig> = {}

	if (options?.userConfigPath) {
		const userPath = path.resolve(options.userConfigPath)
		if (!existsSync(userPath)) {
			throw new Error(`User config file not found at: ${userPath}`)
		}
		userConfig = yamlParse(readFileSync(userPath, 'utf8')) as Partial<AppConfig>
	}

	const mergedConfig = deepMerge(defaultConfig, userConfig) as AppConfig

	if (!validate(mergedConfig)) {
		throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`)
	}

	return mergedConfig
}

export { loadConfig, type AppConfig, type AppConfigPublic }
