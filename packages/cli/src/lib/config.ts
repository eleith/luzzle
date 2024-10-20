import YAML from 'yaml'
import Conf, { Options } from 'conf'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import log from './log.js'
import path from 'path'

export type SchemaConfig = {
	directory: string
	api_keys: {
		google: string
	}
}

const defaultOptions: Options<SchemaConfig> = {
	fileExtension: 'yaml',
	serialize: YAML.stringify,
	deserialize: YAML.parse,
	projectSuffix: '',
	projectName: '@luzzle/cli',
	schema: {
		directory: {
			type: 'string',
			format: 'uri',
			description: 'directory of luzzle files',
		},
		api_keys: {
			type: 'object',
			properties: {
				google: {
					type: 'string',
					description: 'google key for prompting',
				},
			},
		},
	},
}

export function getConfig(path?: string) {
	if (path) {
		return new Conf<SchemaConfig>({
			...defaultOptions,
			cwd: path,
		})
	} else {
		return new Conf<SchemaConfig>(defaultOptions)
	}
}

export function getDirectoryFromConfig(config: Conf<SchemaConfig>): string | never {
	const dirUrlPath = config.get('directory')

	if (dirUrlPath) {
		const dirPath = fileURLToPath(dirUrlPath)

		if (existsSync(dirPath)) {
			return dirPath
		}

		throw new Error(`config doesn't exist: ${config.path}`)
	} else {
		log.warn('directory not set in config, using config directory instead')
		return path.dirname(config.path)
	}
}

export type Config = Conf<SchemaConfig>
