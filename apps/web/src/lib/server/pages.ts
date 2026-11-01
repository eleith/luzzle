import path from 'node:path'
import { config } from '#lib/server/config.js'
import { loadMarkdownFile } from '#lib/content/markdown/files.server.js'

export function loadPageMarkdown(
	file?: string,
	configFilename = config.paths.config
): Promise<string | undefined> {
	if (file === undefined) return Promise.resolve(undefined)
	if (!configFilename) throw new Error('A supplied config path is required for page Markdown')
	const filename = path.resolve(path.dirname(configFilename), file)
	return loadMarkdownFile(filename)
}
