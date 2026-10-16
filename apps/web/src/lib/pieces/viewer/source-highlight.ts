import { classHighlighter, highlightTree } from '@lezer/highlight'
import { extraClasses } from '../../components/editor/themes/token-classes'
import { SOURCE_SIZE_LIMIT, sourceLanguage, type SourceToken } from './source'

export async function highlightSource(content: string, mime: string): Promise<SourceToken[]> {
	const plain = [{ text: content, classes: '' }]
	const name = sourceLanguage(mime)
	if (!name || content.length > SOURCE_SIZE_LIMIT || !content.length) return plain

	try {
		const { languages } = await import('@codemirror/language-data')
		const description = languages.find((language) => language.name === name)
		if (!description) return plain
		const support = await description.load()
		const tree = support.language.parser.parse(content)
		const tokens: SourceToken[] = []
		let position = 0
		highlightTree(tree, [classHighlighter, extraClasses], (from, to, classes) => {
			if (from > position) tokens.push({ text: content.slice(position, from), classes: '' })
			tokens.push({ text: content.slice(from, to), classes })
			position = to
		})
		if (position < content.length) tokens.push({ text: content.slice(position), classes: '' })
		return tokens.length ? tokens : plain
	} catch {
		return plain
	}
}
