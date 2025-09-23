import { readFileSync, existsSync } from 'fs'
import * as path from 'path'
import { parse as yamlParse } from 'yaml'
import Ajv from 'ajv'
import schema from '../../../config/config.schema.json' with { type: 'json' }

export type AppConfig = {
	url: {
		app: string
		app_assets: string
		luzzle_assets: string
		editor: string
	}
	text: {
		title: string
		description: string
	}
	paths: {
		database: string
	}
}

export type AppConfigPublic = {
	url: Pick<AppConfig['url'], 'app' | 'luzzle_assets' | 'app_assets'>
	text: AppConfig['text']
}

function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
	const output = { ...target } as T & U

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const targetValue = output[key as keyof (T & U)]
			const sourceValue = source[key as keyof U]

			if (
				sourceValue instanceof Object &&
				!Array.isArray(sourceValue) &&
				targetValue instanceof Object &&
				!Array.isArray(targetValue)
			) {
				output[key as keyof (T & U)] = deepMerge(
					targetValue as object,
					sourceValue as object
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				) as any
			} else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				output[key as keyof (T & U)] = [...targetValue, ...sourceValue] as any
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				output[key as keyof (T & U)] = sourceValue as any
			}
		}
	}
	return output
}

function initializeConfig(): AppConfig {
	const ajv = new Ajv()
	const validate = ajv.compile(schema)
	const userPathEnv = process.env.LUZZLE_CONFIG_PATH
	const defaultPath = path.resolve(process.cwd(), './config/config.defaults.yaml')
	const userPath = userPathEnv || path.resolve(process.cwd(), './config/config.yaml')
	const defaultConfig = yamlParse(readFileSync(defaultPath, 'utf8')) as Partial<AppConfig>

	let userConfig: Partial<AppConfig> = {}
	if (existsSync(userPath)) {
		userConfig = yamlParse(readFileSync(userPath, 'utf8')) as Partial<AppConfig>
	}

	const mergedConfig = deepMerge(defaultConfig, userConfig) as AppConfig

	if (!validate(mergedConfig)) {
		throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`)
	}
	
	return mergedConfig
}

export const config = initializeConfig()
