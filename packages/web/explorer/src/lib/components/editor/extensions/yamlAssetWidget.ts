import { ViewPlugin, EditorView, Decoration, WidgetType, ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { yamlLanguage } from '@codemirror/lang-yaml'
import { getFrontmatterRange, buildPath } from './yamlUtils'

export type AssetWidgetHandler = (assetUrl: string) => { href: string; title: string }

class AssetWidget extends WidgetType {
	constructor(
		private href: string,
		private title: string,
		private svg: string
	) {
		super()
	}

	eq(other: AssetWidget) {
		return this.href === other.href
	}

	toDOM() {
		const a = document.createElement('a')
		a.href = this.href
		a.title = this.title
		a.innerHTML = this.svg
		a.className = 'cm-yaml-asset-icon'
		a.target = '_blank'
		a.rel = 'nofollow'
		return a
	}
}

function yamlAssetWidgetPlugin(icon: string, assetFields: string[], handler: AssetWidgetHandler): Extension {
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
				if (assetFields.length === 0) return Decoration.none

				const doc = view.state.doc.toString()
				const range = getFrontmatterRange(doc)
				if (!range) return Decoration.none

				const yaml = doc.slice(range.from, range.to)
				const tree = yamlLanguage.parser.parse(yaml)

				const widgets: Array<{ from: number; to: number; value: Decoration }> = []

				tree.iterate({
					enter(node) {
						if (node.type.name !== 'String' && node.type.name !== 'Bare') return

						const parent = node.node.parent
						if (!parent || parent.type.name !== 'Pair') return

						let keyNode = parent.firstChild
						while (keyNode && keyNode.type.name !== 'Key') {
							keyNode = keyNode.nextSibling
						}
						if (!keyNode) return

						const path = buildPath(keyNode, yaml)
						if (!assetFields.includes(path)) return

						const rawValue = yaml.slice(node.from, node.to)
						const value = rawValue.replace(/^['"]|['"]$/g, '')

						if (!value.startsWith('.assets/')) return

						const result = handler(value)

						widgets.push({
							from: range.from + node.from,
							to: range.from + node.to,
							value: Decoration.mark({ class: 'cm-yaml-asset-underline' })
						})

						widgets.push({
							from: range.from + node.to,
							to: range.from + node.to,
							value: Decoration.widget({
								widget: new AssetWidget(result.href, result.title, icon),
								side: 1
							})
						})
					}
				})

				if (widgets.length === 0) return Decoration.none
				
				// Ensure widgets are sorted by 'from', as required by Decoration.set
				widgets.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide)
				
				return Decoration.set(widgets, true)
			}
		},
		{ decorations: (v) => v.decorations }
	)
}

export const yamlAssetWidgetStyle = EditorView.baseTheme({
	'.cm-yaml-asset-underline': {
		textDecoration: 'underline dotted',
		textUnderlineOffset: '3px',
		color: 'var(--cm-attribute)'
	},
	'.cm-yaml-asset-icon': {
		display: 'inline-block',
		verticalAlign: 'middle',
		marginLeft: '0.3ch',
		cursor: 'pointer',
		color: 'var(--cm-attribute)'
	},
	'.cm-yaml-asset-icon svg': {
		display: 'block'
	}
})

export function yamlAssetWidget(icon: string, assetFields: string[], handler: AssetWidgetHandler): Extension {
	if (assetFields.length === 0) return []
	return [yamlAssetWidgetPlugin(icon, assetFields, handler), yamlAssetWidgetStyle]
}
