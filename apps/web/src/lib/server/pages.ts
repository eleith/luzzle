import path from 'node:path'
import { config } from '$lib/server/config'
import { loadMarkdownFile } from '$lib/content/markdown/files.server.js'

export function loadPageMarkdown(file?: string): Promise<string | undefined> {
	if (file === undefined) return Promise.resolve(undefined)
	if (!config.paths.config) throw new Error('A supplied config path is required for page Markdown')
	const filename = path.resolve(path.dirname(config.paths.config), file)
	return loadMarkdownFile(filename)
}
