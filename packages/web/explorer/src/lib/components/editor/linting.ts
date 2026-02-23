import { linter, type Diagnostic } from '@codemirror/lint'
import { parseDocument, isMap, isSeq, isPair, isScalar, type Node } from 'yaml'
import type { EditorView } from 'codemirror'
import { syntaxTree } from '@codemirror/language'
import type { ValidationResponse } from '$lib/types/validation'

function findNode(node: Node | null, path: string[]): Node | null {
	if (!node || path.length === 0) return node

	const key = path[0]

	if (isMap(node)) {
		const pair = node.items.find((p) => {
			if (isPair(p)) {
				const k = p.key
				if (isScalar(k)) {
					return String(k.value) === key
				}
			}
			return false
		})

		if (pair) {
			if (path.length === 1) {
				return (pair.value || pair.key) as Node | null
			}
			return findNode(pair.value as Node, path.slice(1))
		}
	}

	if (isSeq(node)) {
		const index = parseInt(key, 10)
		if (!isNaN(index) && node.items[index]) {
			return findNode(node.items[index] as Node, path.slice(1))
		}
	}

	return null
}

export function createFrontmatterLinter(type: string) {
	return linter(
		async (view: EditorView) => {
			const doc = view.state.doc
			const tree = syntaxTree(view.state)
			const diagnostics: Diagnostic[] = []

			const topNode = tree.topNode
			const firstChild = topNode.firstChild
			let frontmatterNode: { from: number; to: number } | null = null

			if (firstChild && firstChild.name === 'Frontmatter') {
				frontmatterNode = firstChild
			}

			if (!frontmatterNode) return []

			const frontmatterBlock = doc.sliceString(frontmatterNode.from, frontmatterNode.to)
			const innerMatch = frontmatterBlock.match(/^---\s*\n([\s\S]*?)\n---\s*$/)

			let yamlContent = ''
			let offsetStart = frontmatterNode.from

			if (innerMatch) {
				yamlContent = innerMatch[1]
				const matchIndex = frontmatterBlock.indexOf(yamlContent)
				if (matchIndex !== -1) {
					offsetStart += matchIndex
				} else {
					offsetStart += 4
				}
			} else {
				if (frontmatterBlock.startsWith('---')) {
					yamlContent = frontmatterBlock.slice(3)
					offsetStart += 3
					const endIdx = yamlContent.lastIndexOf('---')
					if (endIdx !== -1) {
						yamlContent = yamlContent.slice(0, endIdx)
					}
				}
			}

			const yamlDoc = parseDocument(yamlContent)

			if (yamlDoc.errors.length > 0) {
				for (const err of yamlDoc.errors) {
					diagnostics.push({
						from: (err.pos?.[0] || 0) + offsetStart,
						to: (err.pos?.[1] || 0) + offsetStart,
						severity: 'error',
						message: err.message,
						source: 'yaml'
					})
				}
				return diagnostics
			}

			const data = yamlDoc.toJSON()
			const validData = data || {}

			let bodyStartPos = frontmatterNode.to
			const docString = doc.toString()
			if (docString[bodyStartPos] === '\n') {
				bodyStartPos += 1
			}
			const bodyContent = docString.slice(bodyStartPos)

			try {
				const response = await fetch('/api/editor/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ type, data: validData, markdown: bodyContent })
				})

				if (!response.ok) {
					return []
				}

				const result: ValidationResponse = await response.json()

				if (!result.valid && result.errors) {
					for (const err of result.errors) {
						if (err.source === 'frontmatter') {
							const path = (err.path || '').split('/').filter(Boolean)
							const node = findNode(yamlDoc.contents as Node, path)

							let from = offsetStart
							let to = offsetStart + yamlContent.length

							if (node && node.range) {
								from = node.range[0] + offsetStart
								to = node.range[1] + offsetStart
							} else if (path.length > 0) {
								const parent = findNode(yamlDoc.contents as Node, path.slice(0, -1))
								if (parent && parent.range) {
									from = parent.range[0] + offsetStart
									to = parent.range[1] + offsetStart
								}
							}

							diagnostics.push({
								from,
								to,
								severity: 'error',
								message: err.message,
								source: 'schema'
							})
						} else if (err.source === 'markdown' && err.line) {
							const startLineNumber = doc.lineAt(bodyStartPos).number
							const targetLineNumber = startLineNumber + err.line - 1

							if (targetLineNumber <= doc.lines) {
								const line = doc.line(targetLineNumber)
								diagnostics.push({
									from: line.from,
									to: line.to,
									severity: 'warning',
									message: err.message,
									source: 'markdown'
								})
							}
						}
					}
				}
			} catch (error) {
				console.error('Error validation:', error)
			}

			return diagnostics
		},
		{
			delay: 500
		}
	)
}
