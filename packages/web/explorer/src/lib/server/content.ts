import { readFile, access, constants as mode } from 'fs/promises'
import * as path from 'path'
import { marked } from 'marked'
import { config } from './config'
import { dev } from '$app/environment'

const cache = new Map<string, string>()

async function loadBlock(blockName: keyof typeof config.content.block): Promise<string> {
	if (!dev && cache.has(blockName)) {
		return cache.get(blockName)!
	}

	const filePath = path.resolve(process.cwd(), config.content.block[blockName])

	try {
		await access(filePath, mode.R_OK)
	} catch {
		throw new Error(`Content block file not found: ${filePath}`)
	}

	const markdown = await readFile(filePath, 'utf8')
	const html = (await marked.parse(markdown)) as string

	if (!dev) {
		cache.set(blockName, html)
	}

	return html
}

export { loadBlock }
