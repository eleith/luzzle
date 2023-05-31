import YAML from 'yaml'
import Conf, { Options } from 'conf'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

export type SchemaConfig = {
  directory: string
  deploy: {
    url: string
    token: string
    body?: string
  }
  books: {
    google_api_key: string
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
    deploy: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'url to send webhook to',
        },
        body: {
          type: 'string',
          description: 'body of webhook',
        },
        token: {
          type: 'string',
          description: 'authentication token for webhook',
        },
      },
      required: ['url', 'token'],
    },
    books: {
      type: 'object',
      properties: {
        google_api_key: {
          type: 'string',
          description: 'google api key for books',
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
  }

  throw new Error(`config doesn't exist: ${config.path}`)
}

export type Config = Conf<SchemaConfig>
