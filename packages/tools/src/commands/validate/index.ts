import { loadConfig } from '../../lib/config/config.js'

export default function checkConfig(configPath: string) {
	try {
		loadConfig(configPath)
		console.log('✅ Configuration is valid.')
	} catch (error) {
		console.error('❌ Configuration check failed:', error)
		process.exit(1)
	}
}
