import { loadConfig } from '../lib/config-loader.js'

export function checkConfig(configPath: string) {
	try {
		loadConfig({ userConfigPath: configPath })
		console.log('✅ Configuration is valid.')
	} catch (error) {
		console.error('❌ Configuration check failed:', error)
		process.exit(1)
	}
}
