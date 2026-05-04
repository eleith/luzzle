import {
	ViewPlugin,
	EditorView,
	Decoration,
	MatchDecorator,
	WidgetType,
	ViewUpdate
} from '@codemirror/view'
import type { Extension, Range } from '@codemirror/state'

const URL_REGEX = /\bhttps?:\/\/[^\s<>"'`]+/gi
const ASSET_REGEX = /\.assets\/[^\s<>"'`]+/gi

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="none"/>
  <circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
  <line x1="160" y1="96" x2="96" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
  <polyline points="112 96 160 96 160 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
</svg>`

class LinkWidget extends WidgetType {
	constructor(
		private href: string,
		private className: string,
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
		a.className = this.className
		return a
	}
}

const urlDecorator = new MatchDecorator({
	regexp: URL_REGEX,
	decorate: (add, from, to, _match, _view) => {
		add(from, to, Decoration.mark({ class: 'cm-url-tester-underline cm-url-tester-asset' }))
		add(
			to,
			to,
			Decoration.widget({
				widget: new LinkWidget(_match[0], 'cm-url-tester-icon', `Open ${_match[0]}`, iconSvg),
				side: 1
			})
		)
	}
})

const assetDecorator = new MatchDecorator({
	regexp: ASSET_REGEX,
	decorate: (add, from, to, match, _view) => {
		add(from, to, Decoration.mark({ class: 'cm-url-tester-underline cm-url-tester-asset' }))
		add(
			to,
			to,
			Decoration.widget({
				widget: new LinkWidget(
					`/editor/asset/${match[0]}`,
					'cm-url-tester-icon',
					`View ${match[0]}`,
					iconSvg
				),
				side: 1
			})
		)
	}
})

function collectRanges(
	set: {
		between: (
			f: number,
			t: number,
			cb: (from: number, to: number, value: Decoration) => void
		) => void
	},
	max: number
) {
	const ranges: Range<Decoration>[] = []
	set.between(0, max, (from, to, value) => {
		ranges.push({ from, to, value })
	})
	return ranges
}

function hyperlinkExtension(): Extension {
	return ViewPlugin.fromClass(
		class {
			private urlDecos = Decoration.none
			private assetDecos = Decoration.none

			constructor(view: EditorView) {
				this.urlDecos = urlDecorator.createDeco(view)
				this.assetDecos = assetDecorator.createDeco(view)
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.urlDecos = urlDecorator.updateDeco(update, this.urlDecos)
					this.assetDecos = assetDecorator.updateDeco(update, this.assetDecos)
				}
			}

			get decorations() {
				const len = 1e9
				const ranges = [
					...collectRanges(this.urlDecos, len),
					...collectRanges(this.assetDecos, len)
				]
				return Decoration.set(ranges, true)
			}
		},
		{ decorations: (v) => v.decorations }
	)
}

const hyperlinkStyle = EditorView.baseTheme({
	'.cm-url-tester-underline': {
		textDecoration: 'underline dotted',
		textUnderlineOffset: '3px',
		color: 'var(--cm-attribute)'
	},
	'.cm-url-tester-icon': {
		display: 'inline-block',
		verticalAlign: 'middle',
		marginLeft: '0.3ch',
		cursor: 'pointer',
		color: 'var(--cm-attribute)'
	},
	'.cm-url-tester-icon svg': {
		display: 'block'
	}
})

export const hyperlink: Extension = [hyperlinkExtension(), hyperlinkStyle]
