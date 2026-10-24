import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { renderMarkdown } from './render.server.js'

const files = new Map<string, Promise<string>>()

export function loadMarkdownFile(filename: string): Promise<string> {
	if (!path.isAbsolute(filename)) throw new Error('Markdown file paths must be absolute')
	const key = path.normalize(filename)
	let html = files.get(key)
	if (!html) {
		html = readFile(key, 'utf8')
			.then(renderMarkdown)
			.catch((cause: unknown) => {
				throw new Error(`Unable to load Markdown file "${key}"`, { cause })
			})
		files.set(key, html)
	}
	return html
}
