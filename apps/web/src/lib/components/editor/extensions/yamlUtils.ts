import type { SyntaxNode } from '@lezer/common'

const MAX_DEPTH = 20

export function buildPath(keyNode: SyntaxNode, doc: string): string {
	const getRaw = (node: SyntaxNode) => doc.slice(node.from, node.to).replace(/^['"]|['"]$/g, '')
	const parts: string[] = [getRaw(keyNode)]

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
				parts.unshift(getRaw(key))
				current = key.parent
				continue
			}
		}

		break
	}

	return parts.join('.')
}
