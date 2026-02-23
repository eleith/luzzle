import { CompletionContext, type Completion, type CompletionResult } from '@codemirror/autocomplete'
import { parseDocument, isMap, isPair, isScalar } from 'yaml'
import { syntaxTree } from '@codemirror/language'
import { getFrontmatterInfo } from './utils'

export function createFrontmatterAutocomplete(schema: Record<string, unknown>) {
	return (context: CompletionContext): CompletionResult | null => {
		const doc = context.state.doc
		const pos = context.pos
		const tree = syntaxTree(context.state)

		const info = getFrontmatterInfo(context.state)

		if (!info.exists || pos < info.from || pos > info.to) {
			return null
		}

		const node = tree.resolveInner(pos, -1)

		if (node.name === 'Comment') {
			return null
		}

		let isKeyContext = false
		let isValueContext = false
		let currentKey = ''

		if (node.name === 'PropertyName' || node.name === 'Key') {
			isKeyContext = true
			currentKey = doc.sliceString(node.from, pos)
		} else if (node.name === 'String' || node.name === 'Literal' || node.name === 'Quote') {
			isValueContext = true
			if (node.parent && node.parent.name === 'Pair') {
				const keyNode = node.parent.firstChild
				if (keyNode && (keyNode.name === 'PropertyName' || keyNode.name === 'Key')) {
					currentKey = doc.sliceString(keyNode.from, keyNode.to)
				}
			}
		} else if (
			node.name === 'BlockMapping' ||
			node.name === 'Frontmatter' ||
			node.name === 'Pair' ||
			node.name === 'Document' ||
			node.name === 'Stream' ||
			node.name === '⚠' ||
			node.type.isError
		) {
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
		} else if (context.explicit) {
			isKeyContext = true
			const line = doc.lineAt(pos)
			currentKey = line.text.slice(0, pos - line.from).trim()
		}

		const options: Completion[] = []
		let from = pos

		const adjustFrom = () => {
			const wordMatch = doc.sliceString(0, pos).match(/[\w-]*$/)
			if (wordMatch) from = pos - wordMatch[0].length
		}

		if (isKeyContext) {
			adjustFrom()

			if (schema.properties) {
				const existingKeys = new Set<string>()
				try {
					const yamlDoc = parseDocument(info.content)
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
