import { visit } from 'unist-util-visit'
import type { Element, Nodes, Root } from 'hast'

function taskText(node: Nodes): string {
	if (node.type === 'text') return node.value
	if (node.type !== 'element') return ''
	if (
		node.properties.popover !== undefined ||
		node.properties.hidden ||
		node.properties.ariaHidden === true ||
		node.properties.ariaHidden === 'true'
	)
		return ''

	switch (node.tagName) {
		case 'input':
		case 'button':
		case 'select':
		case 'textarea':
		case 'ul':
		case 'ol':
		case 'script':
		case 'style':
			return ''
		case 'br':
			return ' '
		case 'p':
		case 'div':
			return ` ${node.children.map(taskText).join('')} `
		case 'img':
			return typeof node.properties.alt === 'string' ? node.properties.alt : ''
		default:
			return node.children.map(taskText).join('')
	}
}

export const rehypeTaskListLabels = () => {
	return (tree: Root) => {
		visit(tree, 'element', (item) => {
			const classes = item.properties.className
			if (item.tagName !== 'li' || !Array.isArray(classes) || !classes.includes('task-list-item'))
				return

			// Prefer a direct checkbox; loose lists keep it inside a paragraph instead.
			const paragraphs = item.children.filter(
				(node): node is Element => node.type === 'element' && node.tagName === 'p'
			)
			for (const content of [item, ...paragraphs]) {
				const checkbox = content.children.find(
					(node): node is Element =>
						node.type === 'element' &&
						node.tagName === 'input' &&
						node.properties.type === 'checkbox' &&
						node.properties.disabled === true
				)
				if (!checkbox) continue
				// Generated GFM checkboxes have no IDs; leave identified author controls alone.
				if (
					checkbox.properties.id ||
					checkbox.properties.ariaLabel ||
					checkbox.properties.ariaLabelledBy
				)
					return

				checkbox.properties.ariaLabel =
					content.children.map(taskText).join('').replace(/\s+/g, ' ').trim() || 'Task'
				return
			}
		})
	}
}
