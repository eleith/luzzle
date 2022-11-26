import YAML from 'yaml'
import Conf, { Options } from 'conf'
import { pathToFileURL, fileURLToPath } from 'url'
import { existsSync } from 'fs'
import path from 'path'

export type SchemaConfig = {
  directory: string
}

const defaultOptions: Options<SchemaConfig> = {
  fileExtension: 'yaml',
  serialize: YAML.stringify,
  deserialize: YAML.parse,
  projectSuffix: '',
  schema: {
    directory: {
      type: 'string',
      format: 'uri',
      description: 'directory of luzzle files',
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

export function getDirectoryFromConfig(config: Conf<SchemaConfig>): string {
  const dirUrlPath = config.get('directory')
  return fileURLToPath(dirUrlPath)
}

export async function inititializeConfig(directory: string): Promise<Conf<SchemaConfig> | never> {
  const config = getConfig()
  const configPath = config.path

  if (existsSync(configPath)) {
    throw new Error(`config file already exists at ${configPath}, please delete it first`)
  }

  const dirUri = pathToFileURL(path.resolve(directory))
  config.set('directory', dirUri.href)

  return config
}

export type Config = Conf<SchemaConfig>
