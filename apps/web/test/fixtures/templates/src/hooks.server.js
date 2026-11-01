import { building } from '$app/env'
import { loadConfig } from '@luzzle/web.templates/config'
import { prepareConfiguredStyles, renderConfiguredStyles } from '#lib/server/configured-styles.js'
import { createErrorHandler } from '#lib/server/error-pages.js'

const configuration = building ? undefined : loadConfig('./config.yaml')
const configuredStyles = configuration ? await prepareConfiguredStyles(configuration) : ''
const handleConfiguredError = configuration ? createErrorHandler(configuration) : undefined

export function handle(request) {
	return renderConfiguredStyles(request, configuredStyles)
}

export function handleError(event) {
	return handleConfiguredError?.(event)
}
