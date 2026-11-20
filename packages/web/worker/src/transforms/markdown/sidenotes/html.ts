import { h } from 'hastscript'
import { visit } from 'unist-util-visit'
import type * as Hast from 'hast'
import type { Handler } from 'mdast-util-to-hast'
import type { Sidenote } from '../remark-sidenotes.js'

interface SidenoteMarkup extends Hast.Parent {
	type: 'sidenoteMarkup'
	children: Hast.ElementContent[]
}

declare module 'hast' {
	interface ElementContentMap {
		sidenoteMarkup: SidenoteMarkup
	}
	interface RootContentMap {
		sidenoteMarkup: SidenoteMarkup
	}
}

function renderSidenoteHeader(noteId: string, contentId: string): Hast.Element {
	return h('span', { className: 'sidenote__header' }, [
		h('span', { className: 'sidenote__label', 'aria-hidden': 'true' }, `Sidenote ${noteId}`),
		h(
			'button',
			{
				type: 'button',
				autoFocus: true,
				className: 'sidenote__close',
				popovertarget: contentId,
				popovertargetaction: 'hide',
				'aria-label': `Close sidenote ${noteId}`
			},
			h('span', { className: 'sidenote__close-icon' }, '×')
		)
	])
}

function addSidenoteDisclosure(content: Hast.ElementContent[]): Hast.ElementContent[] {
	const firstParagraph = content.findIndex((node) => node.type === 'element' && node.tagName === 'p')
	if (firstParagraph === -1) return content
	const rest = content.slice(firstParagraph + 1)
	if (!rest.some((node) => node.type === 'element' || (node.type === 'text' && node.value.trim()))) {
		return content
	}

	return [
		...content.slice(0, firstParagraph + 1),
		h('details', { className: 'sidenote__rest' }, [
			h('summary', [
				h('span', { className: 'sidenote__read-more' }, 'Read more'),
				h('span', { className: 'sidenote__show-less' }, 'Show less')
			]),
			...rest
		])
	]
}

export const sidenoteHandler: Handler = (state, node) => {
	const { noteId, referenceId, inline } = (node as Sidenote).data
	const contentId = `sidenote-${referenceId}`
	const prefix: Hast.ElementContent[] = [
		h('span', { className: 'sidenote__id', 'aria-hidden': 'true' }, noteId),
		{ type: 'text', value: ' ' }
	]
	const content = state.all(node)
	const first = content[0]
	if (!inline && first?.type === 'element' && first.tagName === 'p') {
		first.children.unshift(...prefix)
	} else {
		content.unshift(...prefix)
	}

	const container = inline ? 'span' : 'div'
	const body = h(container, { className: 'sidenote__body' }, content)
	const card = h(
		inline ? 'small' : 'div',
		{
			id: contentId,
			className: 'sidenote__content sidenote__content--live',
			tabIndex: -1,
			popover: 'auto',
			role: 'note',
			'aria-label': `Sidenote ${noteId}`
		},
		[renderSidenoteHeader(noteId, contentId), body]
	)

	// rehype-raw parses these children separately from the article's HTML wrappers.
	return {
		type: 'sidenoteMarkup',
		children: [
			h(
				'button',
				{
					type: 'button',
					className: 'sidenote__button',
					popovertarget: contentId,
					'aria-label': `Sidenote ${noteId}`
				},
				[h('sup', noteId)]
			),
			h(container, { className: 'sidenote__slot' }, [card])
		]
	}
}

export function hasClass(node: Hast.Nodes, className: string): node is Hast.Element {
	return (
		node.type === 'element' &&
		Array.isArray(node.properties.className) &&
		node.properties.className.includes(className)
	)
}

const flowContainers = new Set(['blockquote', 'div', 'li', 'td', 'th'])
export const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export function referenceButton(reference: Hast.Element) {
	return reference.children.find((child) => hasClass(child, 'sidenote__button'))
}

export function referenceTarget(reference: Hast.Element) {
	const id = referenceButton(reference)?.properties.popoverTarget
	return typeof id === 'string' ? id : undefined
}

type Parents = Map<Hast.Nodes, Hast.Parents>

function moveAfter(node: Hast.Element, anchor: Hast.Element, parents: Parents) {
	const from = parents.get(node)
	const to = parents.get(anchor)
	if (!from || !to) return
	from.children.splice(from.children.indexOf(node), 1)
	to.children.splice(to.children.indexOf(anchor) + 1, 0, node)
	parents.set(node, to)
}

// Keep interactive notes out of link labels and block slots out of phrasing content.
export const rehypePlaceSidenotes = () => {
	return (tree: Hast.Root) => {
		const parents: Parents = new Map()
		const slots: Hast.Element[] = []
		const references: Hast.Element[] = []

		visit(tree, 'sidenoteMarkup', (node, index, parent) => {
			if (!parent || index === undefined) return
			parent.children[index] = h('span', { className: 'sidenote' }, node.children)
		})

		visit(tree, (node, _index, parent) => {
			if (parent) parents.set(node, parent)
			if (hasClass(node, 'sidenote__slot') && node.tagName === 'div') slots.push(node)
			if (hasClass(node, 'sidenote')) references.push(node)
		})

		for (const reference of references.reverse()) {
			let link: Hast.Element | undefined
			let inTable = false
			let inHeading = false
			let parent = parents.get(reference)
			while (parent?.type === 'element') {
				if (parent.tagName === 'a') link = parent
				if (parent.tagName === 'table') inTable = true
				if (headingTags.has(parent.tagName)) inHeading = true
				parent = parents.get(parent)
			}

			if (inTable) {
				const slot = reference.children.find((node) => hasClass(node, 'sidenote__slot'))
				const card = slot?.children.find((node) => hasClass(node, 'sidenote__content'))
				if (card) card.properties.className = ['sidenote__content', 'sidenote__content--sheet']
			}
			if (link) {
				const originalParent = parents.get(reference)
				if (inHeading && originalParent) {
					// Keep the original position available to the legacy heading-ID pass.
					originalParent.children.splice(
						originalParent.children.indexOf(reference),
						0,
						h('span', { dataSidenoteSlug: referenceTarget(reference) })
					)
				}
				moveAfter(reference, link, parents)
			}
		}

		// Insert backwards so slots sharing an anchor retain reference order.
		for (const slot of slots.reverse()) {
			let anchor = slot
			let container = parents.get(slot)
			while (container?.type === 'element' && !flowContainers.has(container.tagName)) {
				anchor = container
				container = parents.get(container)
			}
			if (anchor !== slot) moveAfter(slot, anchor, parents)
		}
	}
}

// Run after raw HTML and heading IDs so disclosures see parsed blocks and locators do not alter slugs.
export const rehypePresentSidenotes = () => {
	return (tree: Hast.Root) => {
		const marginNoteIds = new Set<string>()
		const references: Hast.Element[] = []

		visit(tree, 'element', (node) => {
			if (hasClass(node, 'sidenote')) references.push(node)
			if (typeof node.properties.id !== 'string' || !hasClass(node, 'sidenote__content--live')) return
			marginNoteIds.add(node.properties.id)
			if (node.tagName !== 'div') return
			const body = node.children.find((child) => hasClass(child, 'sidenote__body'))
			if (body) body.children = addSidenoteDisclosure(body.children)
		})

		for (const reference of references) {
			const id = referenceTarget(reference)
			const marker = referenceButton(reference)?.children[0]
			const number = marker?.type === 'element' ? marker.children[0] : undefined
			if (!id || !marginNoteIds.has(id) || number?.type !== 'text') continue

			reference.children.unshift(
				h('sup', { className: 'sidenote__reference' }, [
					h('a', { href: `#${id}`, 'aria-label': `Locate sidenote ${number.value}` }, number.value)
				])
			)
		}
	}
}
