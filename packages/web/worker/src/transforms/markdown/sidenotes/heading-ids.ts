import { h } from 'hastscript'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import { visit } from 'unist-util-visit'
import type * as Hast from 'hast'
import type { Plugin } from 'unified'
import { hasClass, headingTags, referenceButton, referenceTarget } from './html.js'

const previewBreaks = new Set([
	'blockquote', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre',
	'section', 'table', 'td', 'th', 'tr', 'ul'
])

function legacyPreviewText(node: Hast.ElementContent): string {
	if (node.type === 'text') return node.value
	if (node.type !== 'element') return ''
	if (node.tagName === 'script' || node.tagName === 'style') return ''
	const { tagName, children } = node
	if (hasClass(node, 'sidenote__header') || hasClass(node, 'sidenote__id')) return ''
	const text = children.map(legacyPreviewText).join('')
	return previewBreaks.has(tagName) ? ` ${text} ` : text
}

function legacyReference(reference: Hast.Element, button: Hast.Element) {
	const slot = reference.children.find((node) => hasClass(node, 'sidenote__slot'))
	const card = slot?.children.find((node) => hasClass(node, 'sidenote__content'))
	const body = card?.children.find((node) => hasClass(node, 'sidenote__body'))
	if (!body) return h('span', [button])

	const marker = button.children[0]
	const number = marker?.type === 'element' ? marker.children[0] : undefined
	if (number?.type !== 'text') return h('span', [button])
	const label = number.value
	return h('span', [
		button,
		h('span', { className: 'sidenote__slot' }, [
			h('button', { className: 'sidenote__preview' }, `${label} `),
			h('small', { className: 'sidenote__content' }, [
				h('span', { className: 'sidenote__header' }, [
					h('span', `Sidenote ${label}`),
					h('button', `${label}×`)
				]),
				...body.children
			])
		])
	])
}

type ChildPosition = { parent: Hast.Parents; index: number }

function legacyHeading(heading: Hast.Element): Hast.Element {
	const copy = structuredClone(heading)
	const references: Array<ChildPosition & { node: Hast.Element }> = []
	const originalPositions = new Map<string, ChildPosition>()
	visit(copy, 'element', (node, index, parent) => {
		if (!parent || index === undefined) return
		if (hasClass(node, 'sidenote')) references.push({ node, index, parent })
		const id = node.properties.dataSidenoteSlug
		if (typeof id === 'string') originalPositions.set(id, { index, parent })
	})

	for (const { node, parent, index } of references) {
		const id = referenceTarget(node)
		const button = referenceButton(node)
		if (!id || !button) continue
		const legacy = legacyReference(node, button)
		const original = originalPositions.get(id)
		if (original) {
			original.parent.children[original.index] = legacy
			parent.children[index] = { type: 'text', value: '' }
		} else {
			parent.children[index] = legacy
		}
	}
	return copy
}

function fillLegacyPreviews(tree: Hast.Root) {
	visit(tree, 'element', (slot) => {
		if (!hasClass(slot, 'sidenote__slot')) return
		const preview = slot.children.find((node) => hasClass(node, 'sidenote__preview'))
		const card = slot.children.find((node) => hasClass(node, 'sidenote__content'))
		if (!preview || !card) return
		preview.children.push({
			type: 'text',
			value: legacyPreviewText(card).replace(/\s+/g, ' ').trim()
		})
	})
}

export const rehypeSidenoteHeadingIds: Plugin<[], Hast.Root> = () => {
	const parseHtml = rehypeRaw()
	const assignIds = rehypeSlug()
	return (tree, file) => {
		const originals = new Map<Hast.Element, Hast.ElementContent[]>()
		visit(tree, 'element', (heading) => {
			if (!headingTags.has(heading.tagName) || heading.properties.id) return
			let hasNote = false
			visit(heading, 'element', (node) => {
				if (node.properties.dataSidenoteSlug) hasNote = true
				if (hasClass(node, 'sidenote')) hasNote = true
			})
			if (!hasNote) return

			// Old fragments included the flattened preview after HTML parsing had repaired
			// nested links. Recreate that text on a copy, not in the published markup.
			const projection = parseHtml({ type: 'root', children: [legacyHeading(heading)] }, file)
			fillLegacyPreviews(projection)

			const projectedHeading = projection.children.find(
				(node): node is Hast.Element => node.type === 'element' && node.tagName === heading.tagName
			)
			if (!projectedHeading) return
			originals.set(heading, heading.children)
			heading.children = projectedHeading.children
		})

		try {
			assignIds(tree)
		} finally {
			for (const [heading, children] of originals) heading.children = children
		}

		visit(tree, 'element', (node, index, parent) => {
			if (!node.properties.dataSidenoteSlug || !parent || index === undefined) return
			parent.children.splice(index, 1)
			return index
		})
	}
}
