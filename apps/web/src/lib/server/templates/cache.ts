import { createTemplateFileCache } from '@luzzle/web.templates/server'

export const reloadAuthoredTemplates = process.env.LUZZLE_DEV === 'true'

export function createAuthoredTemplateCaches() {
	const options = { reloadOnChange: reloadAuthoredTemplates }
	// Compiled modules can retain state. Never use a private draft's module for public renders.
	return {
		published: createTemplateFileCache(options),
		preview: createTemplateFileCache(options)
	}
}
