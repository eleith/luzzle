import { CompletionContext, type Completion, type CompletionResult } from '@codemirror/autocomplete'
import { parseDocument, isMap, isPair, isScalar } from 'yaml'
import { syntaxTree } from '@codemirror/language'

export function createFrontmatterAutocomplete(schema: Record<string, unknown>) {
	return (context: CompletionContext): CompletionResult | null => {
		const doc = context.state.doc
		const pos = context.pos
		const tree = syntaxTree(context.state)

		// 1. Detect Frontmatter Block (Syntax Tree)
		let inFrontmatter = false
		let frontmatterNode: { from: number; to: number } | null = null

		const topNode = tree.topNode
		const firstChild = topNode.firstChild

		if (firstChild && firstChild.name === 'Frontmatter') {
			if (pos >= firstChild.from && pos <= firstChild.to) {
				inFrontmatter = true
				frontmatterNode = firstChild
			}
		}

		if (!inFrontmatter || !frontmatterNode) {
			return null
		}

		// 2. Resolve AST Node at Cursor
		const node = tree.resolveInner(pos, -1)

		// If inside a comment, do nothing
		if (node.name === 'Comment') {
			return null
		}

		// 3. Determine Context using Syntax Tree
		let isKeyContext = false
		let isValueContext = false
		let currentKey = ''

		// Detect context based on Lezer YAML grammar node names
		if (node.name === 'PropertyName' || node.name === 'Key') {
			isKeyContext = true
			currentKey = doc.sliceString(node.from, pos)
		} else if (node.name === 'String' || node.name === 'Literal' || node.name === 'Quote') {
			isValueContext = true
			// To get the key, traverse up to the Pair
			if (node.parent && node.parent.name === 'Pair') {
				const keyNode = node.parent.firstChild
				if (keyNode && (keyNode.name === 'PropertyName' || keyNode.name === 'Key')) {
					currentKey = doc.sliceString(keyNode.from, keyNode.to)
				}
			}
		} else if (
			node.name === 'BlockMapping' ||
			node.name === 'Frontmatter' ||
			node.name === 'Pair'
		) {
			// Fallback: Use simple text analysis for empty lines or new keys
			const line = doc.lineAt(pos)
			const textBefore = line.text.slice(0, pos - line.from)

			if (/:\s*$/.test(textBefore)) {
				isValueContext = true
				const keyMatch = textBefore.match(/^\s*([\w-]+):/)
				if (keyMatch) currentKey = keyMatch[1]
			} else {
				isKeyContext = true
				currentKey = textBefore.trim()
			}
		}

		// 4. Generate Completions
		const options: Completion[] = []
		let from = pos

		// Helper to adjust 'from' based on current word
		const adjustFrom = () => {
			const wordMatch = doc.sliceString(0, pos).match(/[\w-]*$/)
			if (wordMatch) from = pos - wordMatch[0].length
		}

		if (isKeyContext) {
			adjustFrom()

			if (schema.properties) {
				// Extract Content for filtering existing keys using string slicing
				const frontmatterBlock = doc.sliceString(frontmatterNode.from, frontmatterNode.to)

				// Find start of content (after first --- line)
				const firstNewline = frontmatterBlock.indexOf('\n')
				let frontmatterContent = ''

				if (firstNewline !== -1) {
					frontmatterContent = frontmatterBlock.slice(firstNewline + 1)

					// Find end of content (before last --- line)
					// We look for the last newline which precedes the closing delimiter
					const lastNewline = frontmatterContent.lastIndexOf('\n')
					if (lastNewline !== -1) {
						frontmatterContent = frontmatterContent.slice(0, lastNewline)
					}
				}

				const existingKeys = new Set<string>()
				try {
					const yamlDoc = parseDocument(frontmatterContent)
					if (yamlDoc.contents && isMap(yamlDoc.contents)) {
						for (const pair of yamlDoc.contents.items) {
							if (isPair(pair) && isScalar(pair.key)) {
								existingKeys.add(String(pair.key.value))
							}
						}
					}
				} catch {
					// Ignore
				}

				for (const key of Object.keys(schema.properties)) {
					if (existingKeys.has(key)) continue

					const properties = schema.properties as Record<string, { type?: string }>
					const prop = properties[key]
					options.push({
						label: key,
						type: 'property',
						detail: prop.type,
						boost: 1
					})
				}
			}
		} else if (isValueContext) {
			adjustFrom()

			const properties = schema.properties as Record<
				string,
				{ type?: string; enum?: unknown[]; examples?: unknown[] }
			>
			const prop = properties[currentKey]

			if (prop) {
				if (prop.type === 'boolean') {
					options.push({ label: 'true', type: 'keyword' })
					options.push({ label: 'false', type: 'keyword' })
				}
				if (prop.enum) {
					for (const val of prop.enum) {
						options.push({ label: String(val), type: 'enum' })
					}
				}
				if (prop.examples) {
					for (const ex of prop.examples) {
						options.push({
							label: String(ex),
							type: 'text',
							detail: 'example'
						})
					}
				}
			}
		}

		if (options.length === 0) return null

		return {
			from,
			options,
			validFor: /^[\w-]*$/
		}
	}
}
