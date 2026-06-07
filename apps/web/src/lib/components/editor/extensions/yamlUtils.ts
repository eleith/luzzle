import type { SyntaxNode } from '@lezer/common'

export function buildPath(keyNode: SyntaxNode, doc: string): string {
	const getRaw = (node: SyntaxNode) => doc.slice(node.from, node.to).replace(/^['"]|['"]$/g, '')
	const parts: string[] = []

	let current: SyntaxNode | null = keyNode
	while (current) {
		if (current.type.name === 'Pair') {
			let key = current.firstChild
			while (key && key.type.name !== 'Key') {
				key = key.nextSibling
			}
			if (key) {
				parts.unshift(getRaw(key))
			}
		}
		current = current.parent
	}

	return parts.join('.')
}
