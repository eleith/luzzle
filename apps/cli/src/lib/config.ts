import YAML from 'yaml'
import Conf, { Options } from 'conf'
import { StorageFileSystem, LuzzleStorage } from '@luzzle/core'
import path from 'path'

type SchemaConfig = {
	api_keys?: {
		google?: string
	}
	database?: {
		type?: 'sqlite'
		path?: string
	}
	storage?: {
		type?: 'filesystem'
		root?: string
	}
}
type Config = Conf<SchemaConfig>

const configOptions: Options<SchemaConfig> = {
	fileExtension: 'yaml',
	serialize: YAML.stringify,
	deserialize: YAML.parse,
	projectSuffix: '',
	projectName: '@luzzle/cli',
	schema: {
		storage: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: ['filesystem'],
					description: 'storage type',
				},
				root: {
					type: 'string',
					description: 'root directory for luzzle files',
				},
			},
		},
		database: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					description: 'path to database file',
				},
				type: {
					type: 'string',
					enum: ['sqlite'],
					description: 'database type',
				},
			},
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

function getConfig(_path?: string) {
	if (_path) {
		const resolvedPath = path.resolve(_path)
		const configDir = path.dirname(resolvedPath)
		const extension = path.extname(resolvedPath)
		const configName = path.basename(resolvedPath, extension)

		return new Conf<SchemaConfig>({
			...configOptions,
			cwd: configDir,
			configName: configName,
			fileExtension: extension.replace(/^\./, ''),
			projectName: '',
		})
	} else {
		return new Conf<SchemaConfig>(configOptions)
	}
}

function withDefaults(config: Conf<SchemaConfig>) {
	const store = config.store
	const configDir = path.dirname(path.resolve(config.path))
	const defaults = {
		storage: {
			root: configDir,
			type: 'filesystem',
		},
		database: {
			type: 'sqlite',
			path: path.join(configDir, 'luzzle.sqlite'),
		},
		api_keys: {
			google: undefined,
		},
	}

	return {
		storage: {
			...defaults.storage,
			...store.storage,
		},
		database: {
			...defaults.database,
			...store.database,
		},
		api_keys: {
			...defaults.api_keys,
			...store.api_keys,
		},
	}
}

function getDatabasePath(config: Conf<SchemaConfig>) {
	const defaults = withDefaults(config)
	const databasePath = config.get('database.path', defaults.database.path)
	const databaseType = config.get('database.type', defaults.database.type)

	if (databaseType == 'sqlite') {
		return databasePath
	}

	throw new Error(`unknown database type: ${databaseType}`)
}

function getStorage(config: Conf<SchemaConfig>): LuzzleStorage {
	const defaults = withDefaults(config)
	const storageRoot = config.get('storage.root', defaults.storage.root)
	const storageType = config.get('storage.type', defaults.storage.type)

	if (storageType == 'filesystem') {
		return new StorageFileSystem(storageRoot)
	}

	throw new Error(`unknown storage type: ${storageType}`)
}

export { getConfig, getStorage, getDatabasePath, withDefaults, type Config, type SchemaConfig }
