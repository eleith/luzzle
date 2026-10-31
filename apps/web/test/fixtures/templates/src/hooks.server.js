import { building } from '$app/env'
import { loadConfig } from '@luzzle/web.templates/config'
import { prepareConfiguredStyles, renderConfiguredStyles } from '#lib/server/configured-styles.js'

const configuredStyles = building ? '' : await prepareConfiguredStyles(loadConfig('./config.yaml'))

export function handle(request) {
	return renderConfiguredStyles(request, configuredStyles)
}
