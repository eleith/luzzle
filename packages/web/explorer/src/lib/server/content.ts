import { processMarkdown } from './markdown'

export async function loadBlock(markdown: string) {
	return await processMarkdown(markdown)
}
