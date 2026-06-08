import { ViewPlugin, EditorView, Decoration, WidgetType, ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import iconSvg from '~icons/ph/arrow-circle-up-right?raw&width=20&height=20'

class MarkdownLinkWidget extends WidgetType {
	constructor(
		private href: string,
		private title: string,
		private svg: string
	) {
		super()
	}

	eq(other: MarkdownLinkWidget) {
		return this.href === other.href
	}

	toDOM() {
		const a = document.createElement('a')
		a.href = this.href
		a.title = this.title
		a.innerHTML = this.svg
		a.className = 'cm-markdown-link-icon'
		a.target = '_blank'
		a.rel = 'nofollow'
		return a
	}
}

const markdownLinkPlugin = ViewPlugin.fromClass(
	class {
		decorations = Decoration.none

		constructor(view: EditorView) {
			this.decorations = this.compute(view)
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.compute(update.view)
			}
		}

		private compute(view: EditorView) {
			const doc = view.state.doc.toString()
			const tree = syntaxTree(view.state)
			const widgets: Array<{ from: number; to: number; value: Decoration }> = []

			tree.iterate({
				enter(node) {
					if (node.type.name !== 'Link' && node.type.name !== 'Image') return

					// 1. Locate the destination URL node
					let urlNode = node.node.firstChild
					while (urlNode && urlNode.type.name !== 'URL') {
						urlNode = urlNode.nextSibling
					}
					if (!urlNode) return

					const rawUrl = doc.slice(urlNode.from, urlNode.to)

					// Resolve links (external vs local asset path)
					let href = rawUrl
					const isAsset = rawUrl.startsWith('.assets/') || rawUrl.startsWith('./.assets/')
					if (isAsset) {
						const cleanAssetPath = rawUrl.replace(/^\.\//, '')
						href = `/admin/asset/${cleanAssetPath}`
					}

					// 2. Locate the link text/label node to decorate
					let textNode = node.node.firstChild
					while (textNode && textNode.type.name !== 'LinkText') {
						textNode = textNode.nextSibling
					}

					// Decorate the text portion if found, otherwise decorate the whole link node
					const targetNode = textNode || node.node

					widgets.push({
						from: targetNode.from,
						to: targetNode.to,
						value: Decoration.mark({ class: 'cm-markdown-link-underline' })
					})

					widgets.push({
						from: targetNode.to,
						to: targetNode.to,
						value: Decoration.widget({
							widget: new MarkdownLinkWidget(href, `Open ${rawUrl}`, iconSvg as unknown as string),
							side: 1
						})
					})
				}
			})

			if (widgets.length === 0) return Decoration.none
			widgets.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide)
			return Decoration.set(widgets, true)
		}
	},
	{ decorations: (v) => v.decorations }
)

const markdownLinkStyle = EditorView.baseTheme({
	'.cm-markdown-link-underline': {
		textDecoration: 'underline dotted',
		textUnderlineOffset: '3px',
		color: 'var(--cm-attribute)'
	},
	'.cm-markdown-link-icon': {
		display: 'inline-block',
		verticalAlign: 'middle',
		marginLeft: '0.3ch',
		cursor: 'pointer',
		color: 'var(--cm-attribute)'
	},
	'.cm-markdown-link-icon svg': {
		display: 'block'
	}
})

export const luzzleMarkdownLink: Extension = [markdownLinkPlugin, markdownLinkStyle]
