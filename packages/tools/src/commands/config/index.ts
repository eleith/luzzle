import { writeFileSync } from 'fs'
import yaml from 'yaml'
import { getConfigValue, setConfigValue, loadConfig } from '../../lib/config/config.js'

export function validateHandler(config: string) {
  try {
    loadConfig(config)
    console.log('Configuration is valid.')
  } catch (error) {
    console.error('Configuration check failed:', error)
    process.exit(1)
  }
}

export function getHandler(userConfig: string, path: string) {
  try {
    const config = loadConfig(userConfig)
    const value = getConfigValue(config, path)
    console.log(value)
  } catch (error) {
    console.error('Could not get value:', error)
    process.exit(1)
  }
}

export function setHandler(userConfig: string, path: string, value: unknown) {
  try {
    const config = loadConfig(userConfig)
    setConfigValue(config, path, value)
    writeFileSync(userConfig, yaml.stringify(config))
    console.log('Configuration updated.')
  } catch (error) {
    console.error('Could not set value:', error)
    process.exit(1)
  }
}
