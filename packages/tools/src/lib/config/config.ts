import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse as yamlParse } from 'yaml'
import { Ajv } from 'ajv'
import { deepMerge } from '../deep-merge.js'
import { type Schema as Config } from './schema.js'

type ConfigPublic = {
	url: Pick<Config['url'], 'app' | 'luzzle_assets' | 'app_assets'>
	text: Config['text']
	theme: Pick<Config['theme'], 'version'>
}

function loadConfig(userConfigPath?: string): Config {
	const __dirname = path.dirname(fileURLToPath(import.meta.url))
	const configPath = path.resolve(__dirname, 'defaults.yaml')
	const schemaPath = path.resolve(__dirname, 'schema.json')
	const schemaContent = readFileSync(schemaPath, 'utf-8')
	const configContent = readFileSync(configPath, 'utf-8')
	const schema = JSON.parse(schemaContent)
	const config = yamlParse(configContent) as Config

	const ajv = new Ajv()
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

function getConfigValue(obj: Config, path: string): unknown {
	return path.split('.').reduce((acc, key) => {
		if (acc && typeof acc === 'object' && key in acc) {
			return acc[key] as Record<string, unknown>
		}
		return undefined
	}, obj as unknown as undefined | Record<string, unknown>)
}

function setConfigValue(obj: Config, path: string, value: unknown): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  let current: Record<string, unknown> = obj as unknown as Record<string, unknown>

  for (const key of keys) {
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[lastKey] = value
}

export { loadConfig, getConfigValue, setConfigValue, type Config, type ConfigPublic }
