import { writeFileSync } from 'fs'
import yaml from 'yaml'
import { getConfigValue, setConfigValue } from '@luzzle/web.utils/server'
import { getConfig } from '../../lib/config.js'

export function validateHandler(configPath?: string) {
	try {
		getConfig(configPath)
		console.log('Configuration is valid.')
	} catch (error) {
		console.error('Configuration check failed:', error)
		process.exit(1)
	}
}

export function getHandler(configPath: string | undefined, path: string) {
	try {
		const config = getConfig(configPath)
		const value = getConfigValue(config, path)
		console.log(value)
	} catch (error) {
		console.error('Could not get value:', error)
		process.exit(1)
	}
}

export function setHandler(configPath: string | undefined, path: string, value: unknown) {
	try {
		const config = getConfig(configPath)
		const resolvedConfigPath = config.paths.config!
		setConfigValue(config, path, value)
		writeFileSync(resolvedConfigPath, yaml.stringify(config))
		console.log('Configuration updated.')
	} catch (error) {
		console.error('Could not set value:', error)
		process.exit(1)
	}
}