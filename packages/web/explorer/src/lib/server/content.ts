import { marked } from 'marked'

export function loadBlock(markdown: string) {
	return marked.parse(markdown)
}
