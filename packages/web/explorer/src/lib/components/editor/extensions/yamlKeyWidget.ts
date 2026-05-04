import { ViewPlugin, EditorView, Decoration, WidgetType, ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { yamlLanguage } from '@codemirror/lang-yaml'
import type { SyntaxNode } from '@lezer/common'

export interface KeyWidgetResult {
	href: string
	title: string
}

export type KeyWidgetHandler = (path: string) => KeyWidgetResult | null

const FRONTMATTER_OPEN = /^---[ \t]*$/m
const MAX_DEPTH = 20

function getFrontmatterRange(text: string): { from: number; to: number } | null {
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

function buildPath(keyNode: SyntaxNode, doc: string): string {
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

class KeyWidget extends WidgetType {
	constructor(
		private href: string,
		private title: string,
		private svg: string
	) {
		super()
	}

	eq(other: KeyWidget) {
		return this.href === other.href
	}

	toDOM() {
		const a = document.createElement('a')
		a.href = this.href
		a.title = this.title
		a.innerHTML = this.svg
		a.className = 'cm-yaml-key-icon'
		a.addEventListener('click', (e) => {
			e.preventDefault()
			window.location.href = this.href
		})
		return a
	}
}

function yamlKeyWidgetPlugin(icon: string, handler: KeyWidgetHandler): Extension {
	return ViewPlugin.fromClass(
		class {
			decorations = Decoration.none

			constructor(view: EditorView) {
				this.decorations = this.compute(view)
			}

			update(update: ViewUpdate) {
				if (update.docChanged) {
					this.decorations = this.compute(update.view)
				}
			}

			private compute(view: EditorView) {
				const doc = view.state.doc.toString()
				const range = getFrontmatterRange(doc)
				if (!range) return Decoration.none

				const yaml = doc.slice(range.from, range.to)
				const tree = yamlLanguage.parser.parse(yaml)

				const widgets: Array<{ from: number; to: number; value: Decoration }> = []

				tree.iterate({
					enter(node) {
						if (node.type.name !== 'Key') return

						const path = buildPath(node.node, yaml)
						let result: KeyWidgetResult | null = null

						try {
							result = handler(path)
						} catch (e) {
							console.error('[yamlKeyWidget] handler error:', e)
							return
						}

						if (!result) return

						widgets.push({
							from: range.from + node.to,
							to: range.from + node.to,
							value: Decoration.widget({
								widget: new KeyWidget(result.href, result.title, icon),
								side: 1
							})
						})
					}
				})

				if (widgets.length === 0) return Decoration.none
				return Decoration.set(widgets, true)
			}
		},
		{ decorations: (v) => v.decorations }
	)
}

export const yamlKeyWidgetStyle = EditorView.baseTheme({
	'.cm-yaml-key-icon': {
		display: 'inline-block',
		verticalAlign: 'middle',
		marginLeft: '0.3ch',
		cursor: 'pointer',
		color: 'var(--cm-variable)'
	},
	'.cm-yaml-key-icon svg': {
		display: 'block'
	},
	'.cm-yaml-key-icon:hover': {
		opacity: '0.7'
	}
})

export function yamlKeyWidget(icon: string, handler: KeyWidgetHandler): Extension {
	return [yamlKeyWidgetPlugin(icon, handler), yamlKeyWidgetStyle]
}
