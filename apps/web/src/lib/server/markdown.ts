import { format } from 'prettier'

export async function normalizeMarkdown(content: string): Promise<string> {
	return format(content, {
		parser: 'markdown',
		proseWrap: 'always',
		printWidth: 80
	})
}

export function normalizeLineEndings(content: string): string {
	return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}
