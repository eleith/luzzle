import { readFileSync, existsSync } from 'fs'
import { parse as yamlParse } from 'yaml'
import Ajv from 'ajv'
import { type Schema as Config } from './schema.js'
import schemaJson from './schema.json' with { type: 'json' }
import { interpolate } from './interpolate.js'

const defaultValidator = new Ajv({ strict: true, useDefaults: true }).compile(schemaJson)
const finalValidator = new Ajv({ strict: true }).compile(schemaJson)

export type ConfigPublic = {
	url: Pick<Config['url'], 'app' | 'luzzle_assets' | 'app_assets'>
	content: Config['content']
}

function loadConfig(userConfigPath?: string): Config {
	let config: Partial<Config> = {}

	if (userConfigPath && existsSync(userConfigPath)) {
		config = (yamlParse(readFileSync(userConfigPath, 'utf8')) as Partial<Config>) || {}
	}

	if (!defaultValidator(config)) {
		throw new Error(`Configuration validation failed: ${defaultValidator.errors?.map(e => e.message).join(', ')}`)
	}

	const finalConfig = interpolate(config) as Config

	if (!finalValidator(finalConfig)) {
		throw new Error(`Configuration validation failed: ${finalValidator.errors?.map(e => e.message).join(', ')}`)
	}

	if (userConfigPath) {
		finalConfig.paths.config = userConfigPath
	}

	return finalConfig
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
