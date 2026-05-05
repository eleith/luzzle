import type { SyntaxNode } from '@lezer/common'

const FRONTMATTER_OPEN = /^---[ \t]*$/m
const MAX_DEPTH = 20

export function getFrontmatterRange(text: string): { from: number; to: number } | null {
	const firstNewline = text.indexOf('\n')
	if (firstNewline === -1 || text.slice(0, firstNewline).trim() !== '---') return null

	let offset = firstNewline + 1
	while (offset < text.length) {
		const nextNewline = text.indexOf('\n', offset)
		const line = nextNewline === -1 ? text.slice(offset) : text.slice(offset, nextNewline)

		if (FRONTMATTER_OPEN.test(line)) {
			return { from: firstNewline + 1, to: offset }
		}

		if (nextNewline === -1) return null
		offset = nextNewline + 1
	}

	return null
}

export function buildPath(keyNode: SyntaxNode, doc: string): string {
	const parts: string[] = [doc.slice(keyNode.from, keyNode.to)]

	let current: SyntaxNode | null = keyNode.parent
	let depth = 0

	while (current && depth < MAX_DEPTH) {
		depth++

		while (current && current.type.name !== 'Pair') {
			current = current.parent
		}
		if (!current) break

		const pair = current
		const blockMapping = pair.parent
		if (!blockMapping) break

		if (blockMapping.parent?.type.name === 'Pair') {
			const ancestorPair = blockMapping.parent
			let key: SyntaxNode | null = ancestorPair.firstChild
			while (key && key.type.name !== 'Key') {
				key = key.nextSibling
			}
			if (key) {
				parts.unshift(doc.slice(key.from, key.to))
				current = key.parent
				continue
			}
		}

		break
	}

	return parts.join('.')
}
