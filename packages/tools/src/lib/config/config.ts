import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { parse as yamlParse } from 'yaml'
import Ajv from 'ajv'
import { deepMerge } from '../deep-merge.js'
import { Schema as Config } from './schema.js'

type ConfigPublic = {
	url: Pick<Config['url'], 'app' | 'luzzle_assets' | 'app_assets'>
	text: Config['text']
	theme: Pick<Config['theme'], 'version'>
}

function loadConfig(userConfigPath?: string): Config {
	const configPath = path.join(import.meta.dirname, 'defaults.yaml')
	const schemaPath = path.join(import.meta.dirname, 'schema.json')
	const schemaContent = readFileSync(schemaPath, 'utf-8')
	const configContent = readFileSync(configPath, 'utf-8')
	const schema = JSON.parse(schemaContent)
	const config = yamlParse(configContent) as Config

	const ajv = new Ajv.default()
	const validate = ajv.compile(schema)

	if (userConfigPath) {
		if (!existsSync(userConfigPath)) {
			throw new Error(`User config file not found at: ${userConfigPath}`)
		}

		const userConfig = yamlParse(readFileSync(userConfigPath, 'utf8')) as Partial<Config>
		const mergedConfig = deepMerge(config, userConfig) as Config

		if (!validate(mergedConfig)) {
			throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`)
		}

		return mergedConfig
	} else {
		/* v8 ignore start */
		if (!validate(config)) {
			throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`)
		}
		/* v8 ignore stop */

		return config
	}
}

export { loadConfig, type Config, type ConfigPublic }
