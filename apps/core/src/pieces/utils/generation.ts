import { Document, isMap, isScalar, visit, type visitor } from 'yaml'
import { addFrontMatter } from '../../lib/frontmatter.js'
import { extractFullMarkdown } from '../../lib/markdown.js'

const removeNullEntries: visitor = {
	Pair(_, pair) {
		if (isScalar(pair.value) && pair.value.value === null) return visit.REMOVE
		return undefined
	},
	Scalar(key, value) {
		if (typeof key === 'number' && value.value === null) return visit.REMOVE
		return undefined
	},
}

export async function mergeGeneratedFields(
	source: string,
	fields: Record<string, unknown>
): Promise<string> {
	const { frontmatter, markdown } = await extractFullMarkdown(source)
	const document = new Document(frontmatter)
	if (!isMap(document.contents)) throw new Error('Frontmatter must be a mapping.')
	const existing = frontmatter instanceof Map ? Object.fromEntries(frontmatter) : frontmatter
	const updates = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null))
	document.contents = document.createNode({ ...existing, ...updates })

	visit(document, removeNullEntries)
	return addFrontMatter(markdown, document.toJS())
}

export function appendGeneratedBody(source: string, body: string): string {
	if (!body) return source
	return source ? `${source}\n\n${body}` : body
}
