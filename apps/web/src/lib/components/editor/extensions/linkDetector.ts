import { ViewPlugin, EditorView, Decoration, MatchDecorator, WidgetType } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'

export interface LinkPattern {
	regex: RegExp
	href: (match: string) => string
	title?: (match: string) => string
}

class LinkWidget extends WidgetType {
	constructor(
		private href: string,
		private title: string,
		private svg: string
	) {
		super()
	}

	eq(other: LinkWidget) {
		return this.href === other.href
	}

	toDOM() {
		const a = document.createElement('a')
		a.href = this.href
		a.target = '_blank'
		a.rel = 'nofollow'
		a.title = this.title
		a.innerHTML = this.svg
		a.className = 'cm-link-detector-icon'
		return a
	}
}

function mergeSets(sets: DecorationSet[]): DecorationSet {
	const ranges = sets.flatMap((set) => {
		const result: { from: number; to: number; value: Decoration }[] = []
		set.between(0, 1e9, (from, to, value) => {
			result.push({ from, to, value })
		})
		return result
	})
	return Decoration.set(ranges, true)
}

function linkDetectorPlugin(icon: string, patterns: LinkPattern[]): Extension {
	const decorators = patterns.map(
		(p) =>
			new MatchDecorator({
				regexp: p.regex,
				decorate: (add, from, to, match, view) => {
					try {
						// Skip if this URL is already part of a markdown Link, Image or URL node
						const tree = syntaxTree(view.state)
						let node: SyntaxNode | null = tree.resolveInner(from, 1)
						let isInsideLink = false
						while (node) {
							if (
								node.type.name === 'Link' ||
								node.type.name === 'Image' ||
								node.type.name === 'URL'
							) {
								isInsideLink = true
								break
							}
							node = node.parent
						}
						if (isInsideLink) return

						const url = match[0]
						const href = p.href(url)
						const title = p.title?.(url) ?? `Open ${url}`

						add(from, to, Decoration.mark({ class: 'cm-link-detector-underline' }))
						add(
							to,
							to,
							Decoration.widget({
								widget: new LinkWidget(href, title, icon),
								side: 1
							})
						)
					} catch (e) {
						console.error('[linkDetector] pattern error:', e)
					}
				}
			})
	)

	return ViewPlugin.fromClass(
		class {
			private sets: DecorationSet[] = decorators.map(() => Decoration.none)
			merged = Decoration.none

			constructor(view: EditorView) {
				this.sets = decorators.map((d) => d.createDeco(view))
				this.merged = mergeSets(this.sets)
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.sets = this.sets.map((s, i) => decorators[i].updateDeco(update, s))
					this.merged = mergeSets(this.sets)
				}
			}
		},
		{ decorations: (v) => v.merged }
	)
}

export const linkDetectorStyle = EditorView.baseTheme({
	'.cm-link-detector-underline': {
		textDecoration: 'underline dotted',
		textUnderlineOffset: '3px',
		color: 'var(--cm-variable)'
	},
	'.cm-link-detector-icon': {
		display: 'inline-block',
		verticalAlign: 'middle',
		marginLeft: '0.3ch',
		cursor: 'pointer',
		color: 'var(--cm-variable)'
	},
	'.cm-link-detector-icon svg': {
		display: 'block'
	}
})

export function linkDetector(icon: string, patterns: LinkPattern[]): Extension {
	if (patterns.length === 0) return []
	return [linkDetectorPlugin(icon, patterns), linkDetectorStyle]
}
