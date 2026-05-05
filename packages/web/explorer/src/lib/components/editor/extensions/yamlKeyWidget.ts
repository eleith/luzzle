import { ViewPlugin, EditorView, Decoration, WidgetType, ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { yamlLanguage } from '@codemirror/lang-yaml'
import { getFrontmatterRange, buildPath } from './yamlUtils'

export interface KeyWidgetResult {
	href: string
	title: string
}

export type KeyWidgetHandler = (path: string) => KeyWidgetResult | null

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
