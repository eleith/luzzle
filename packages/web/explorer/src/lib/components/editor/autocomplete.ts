import { CompletionContext, type Completion, type CompletionResult } from '@codemirror/autocomplete'
import { parseDocument, isMap, isPair, isScalar } from 'yaml'
import { syntaxTree } from '@codemirror/language'

export function createFrontmatterAutocomplete(schema: Record<string, unknown>) {
	return (context: CompletionContext): CompletionResult | null => {
		const doc = context.state.doc
		const pos = context.pos
		const tree = syntaxTree(context.state)

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

		const frontmatterBlock = doc.sliceString(frontmatterNode.from, frontmatterNode.to)
		const innerMatch = frontmatterBlock.match(/^---\s*\n([\s\S]*?)\n---\s*$/)
		let frontmatterContent = ''

		if (innerMatch) {
			frontmatterContent = innerMatch[1]
		} else {
			if (frontmatterBlock.startsWith('---')) {
				frontmatterContent = frontmatterBlock.slice(3)
				const endIdx = frontmatterContent.lastIndexOf('---')
				if (endIdx !== -1) {
					frontmatterContent = frontmatterContent.slice(0, endIdx)
				}
			}
		}

		const line = doc.lineAt(pos)
		const lineText = line.text
		const col = pos - line.from
		const textBeforeCursor = lineText.slice(0, col)

		const keyMatch = textBeforeCursor.match(/^\s*([\w-]*)$/)
		const valueMatch = textBeforeCursor.match(/^\s*([\w-]+):\s*([\w-]*)$/)

		const options: Completion[] = []
		let from = pos

		if (context.explicit && !keyMatch && !valueMatch) {
			if (/^\s*$/.test(textBeforeCursor)) {
				if (schema.properties) {
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
						// Ignore parse errors during autocomplete
					}

					for (const key of Object.keys(schema.properties)) {
						if (existingKeys.has(key)) continue

						const properties = schema.properties as Record<
							string,
							{ type?: string; description?: string }
						>
						const prop = properties[key]
						options.push({
							label: key,
							type: 'property',
							detail: prop.type
							// info: prop.description // Removed per preference
						})
					}
				}
			}
		}

		if (keyMatch) {
			const currentKey = keyMatch[1] || ''
			from = pos - currentKey.length

			if (schema.properties) {
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
		} else if (valueMatch) {
			const key = valueMatch[1]
			const currentValue = valueMatch[2] || ''
			from = pos - currentValue.length

			const properties = schema.properties as Record<
				string,
				{ type?: string; enum?: unknown[]; examples?: unknown[] }
			>
			const prop = properties[key]

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
