import type { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

export interface FrontmatterInfo {
	exists: boolean
	from: number
	to: number
	block: string
	content: string
	contentOffset: number
}

export function getFrontmatterInfo(state: EditorState): FrontmatterInfo {
	const tree = syntaxTree(state)
	const topNode = tree.topNode
	const firstChild = topNode.firstChild

	if (!firstChild || firstChild.name !== 'Frontmatter') {
		return { exists: false, from: 0, to: 0, block: '', content: '', contentOffset: 0 }
	}

	const from = firstChild.from
	const to = firstChild.to
	const doc = state.doc
	const block = doc.sliceString(from, to)

	let content = ''
	let contentOffset = from

	const firstNewline = block.indexOf('\n')

	if (firstNewline !== -1) {
		content = block.slice(firstNewline + 1)
		contentOffset += firstNewline + 1

		const closingDelimiter = content.lastIndexOf('---')

		if (closingDelimiter !== -1) {
			const suffix = content.slice(closingDelimiter + 3)
			if (!suffix.trim()) {
				content = content.slice(0, closingDelimiter)
			}
		}
	} else {
		if (block.startsWith('---')) {
			content = block.slice(3)
			contentOffset += 3
			if (content.endsWith('---')) {
				content = content.slice(0, -3)
			}
		}
	}

	return {
		exists: true,
		from,
		to,
		block,
		content,
		contentOffset
	}
}
