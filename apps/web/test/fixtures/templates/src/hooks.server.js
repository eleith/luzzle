import { building } from '$app/environment'
import { loadConfig } from '@luzzle/web.templates/config'
import { prepareConfiguredStyles, renderConfiguredStyles } from '$lib/server/configured-styles'

const configuredStyles = building ? '' : await prepareConfiguredStyles(loadConfig('./config.yaml'))

export function handle(request) {
	return renderConfiguredStyles(request, configuredStyles)
}
