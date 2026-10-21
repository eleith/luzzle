import path from 'node:path'
import { parseArgs } from 'node:util'
import { loadConfig, resolvePreparedDirectory } from '@luzzle/web.config'
import { publishTemplateBundle } from '../templates/publish.js'

try {
	const { values } = parseArgs({
		options: {
			config: { type: 'string', short: 'c', default: 'config.yaml' },
			help: { type: 'boolean', short: 'h' },
		},
	})
	if (values.help) {
		console.log(
			'Usage: publish-templates [--config <filename>]\n\nPublish configured templates and theme CSS to paths.prepared.\nThe config defaults to ./config.yaml; paths.prepared is relative to its directory.'
		)
	} else {
		const filename = path.resolve(values.config)
		const config = loadConfig(filename)
		const directory = resolvePreparedDirectory(config)
		const published = await publishTemplateBundle(config, directory)
		console.log(JSON.stringify({ directory, ...published }))
	}
} catch (error) {
	console.error(error)
	process.exitCode = 1
}
