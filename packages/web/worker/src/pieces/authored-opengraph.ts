import { createRequire } from 'node:module'
import { createTemplateFileCache } from '@luzzle/web.templates/server'

export const reloadOnChange = process.env.LUZZLE_DEV === 'true'
export const defaultOpengraphFile = createRequire(import.meta.url).resolve('@luzzle/web.templates/opengraphs/default')

// A template's module script can retain data between renders. Never share it across modes.
export const opengraphCaches = {
	published: createTemplateFileCache({ reloadOnChange }),
	preview: createTemplateFileCache({ reloadOnChange }),
}
export type OpengraphMode = keyof typeof opengraphCaches
