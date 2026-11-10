import { format } from 'prettier'

export async function normalizeMarkdown(content: string): Promise<string> {
	return format(content, {
		parser: 'markdown',
		proseWrap: 'always',
		printWidth: 80
	})
}
