import { readFileSync, existsSync } from 'fs'
import { parse as yamlParse } from 'yaml'
import Ajv from 'ajv'
import { deepMerge } from '../deep-merge.js'
import { type Schema as Config } from './schema.js'
import defaults from './defaults.json' with { type: 'json' }
import schemaJson from './schema.json' with { type: 'json' }

export type ConfigPublic = {
	url: Pick<Config['url'], 'app' | 'luzzle_assets' | 'app_assets'>
	content: Config['content']
}

function replaceEnvVars(obj: unknown): unknown {
	if (typeof obj === 'string') {
		return obj.replace(/\$\$|\$\{([^}:]+)(?::-([^}]*))?\}/g, (match, varName, defaultValue) => {
			if (match === '$$') {
				return '$'
			}

			const value = process.env[varName]
			if (value !== undefined) {
				return value
			}

			if (defaultValue !== undefined) {
				return defaultValue
			}

			console.warn(`Config warning: Environment variable "${varName}" is missing.`)
			return match
		})
	}

	if (Array.isArray(obj)) {
		return obj.map(replaceEnvVars)
	}

	if (obj !== null && typeof obj === 'object') {
		const result: Record<string, unknown> = {}
		for (const key in obj) {
			result[key] = replaceEnvVars((obj as Record<string, unknown>)[key])
		}
		return result
	}

	return obj
}

function loadConfig(userConfigPath?: string): Config {
	const schema = schemaJson
	const config = defaults as Config
	const ajv = new Ajv({ strict: true })
	const validate = ajv.compile(schema)

	config.paths.config = userConfigPath

	if (userConfigPath) {
		if (existsSync(userConfigPath)) {
			const userConfig = yamlParse(readFileSync(userConfigPath, 'utf8')) as Partial<Config>
			let mergedConfig = deepMerge(config, userConfig) as Config
			mergedConfig = replaceEnvVars(mergedConfig) as Config

			if (!validate(mergedConfig)) {
				throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`)
			}

			return mergedConfig
		} else {
			/* v8 ignore start */
			console.warn(`User config file not found at: ${userConfigPath}`)
			/* v8 ignore stop */
		}
	}

	/* v8 ignore start */
	if (!validate(config)) {
		throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`)
	}
	/* v8 ignore stop */

	return config
}

function getConfigValue(obj: Config, path: string): unknown {
	return path.split('.').reduce(
		(acc, key) => {
			if (acc && typeof acc === 'object' && key in acc) {
				return acc[key] as Record<string, unknown>
			}
			return undefined
		},
		obj as unknown as undefined | Record<string, unknown>
	)
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

export { loadConfig, getConfigValue, setConfigValue, type Config }
