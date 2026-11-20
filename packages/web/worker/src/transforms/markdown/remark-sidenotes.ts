import { visit, SKIP } from 'unist-util-visit'
import { ok as assert } from 'devlop'
import { normalizeIdentifier } from 'micromark-util-normalize-identifier'
import type * as Mdast from 'mdast'
import type { Processor, Data } from 'unified'
import type { Extension as MicromarkExtension, Token } from 'micromark-util-types'
import type { CompileContext, Extension as FromMarkdownExtension } from 'mdast-util-from-markdown'
import { sidenoteSyntax } from './sidenotes/syntax.js'

interface SidenoteReference extends Mdast.Node {
	type: 'sidenoteReference'
	identifier: string
	label: string
	children: []
	referenceType: 'shortcut'
}

interface SidenoteDefinition extends Mdast.Parent {
	type: 'sidenoteDefinition'
	identifier: string
	label: string
	children: Array<Mdast.RootContent>
}

export interface Sidenote extends Mdast.Parent {
	type: 'sidenote'
	data: Mdast.Data & { noteId: string; referenceId: number; inline: boolean }
	children: Array<Mdast.RootContent>
}

declare module 'mdast' {
	interface RootContentMap {
		sidenoteReference: SidenoteReference
		sidenoteDefinition: SidenoteDefinition
		sidenote: Sidenote
	}
	interface PhrasingContentMap {
		sidenoteReference: SidenoteReference
		sidenote: Sidenote
	}
}

function enterSidenoteCallString(this: CompileContext) {
	this.buffer()
}

function enterSidenoteCall(this: CompileContext, token: Token) {
	const reference: SidenoteReference = {
		type: 'sidenoteReference',
		identifier: '',
		label: '',
		children: [],
		referenceType: 'shortcut'
	}
	this.enter(reference, token)
}

function enterSidenoteDefinitionLabelString(this: CompileContext) {
	this.buffer()
}

function enterSidenoteDefinition(this: CompileContext, token: Token) {
	this.enter({ type: 'sidenoteDefinition', identifier: '', label: '', children: [] }, token)
}

function exitSidenoteCallString(this: CompileContext, token: Token) {
	const label = this.resume()
	const node = this.stack[this.stack.length - 1] as SidenoteReference
	node.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase()
	node.label = label
}

function exitSidenoteCall(this: CompileContext, token: Token) {
	this.exit(token)
}

function exitSidenoteDefinitionLabelString(this: CompileContext, token: Token) {
	const label = this.resume()
	const node = this.stack[this.stack.length - 1] as SidenoteDefinition
	assert(node.type === 'sidenoteDefinition')
	node.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase()
	node.label = label
}

function exitSidenoteDefinition(this: CompileContext, token: Token) {
	this.exit(token)
}

function sidenoteFromMarkdown(): FromMarkdownExtension {
	return {
		enter: {
			sidenoteCallString: enterSidenoteCallString,
			sidenoteCall: enterSidenoteCall,
			sidenoteDefinitionLabelString: enterSidenoteDefinitionLabelString,
			sidenoteDefinition: enterSidenoteDefinition
		},
		exit: {
			sidenoteCallString: exitSidenoteCallString,
			sidenoteCall: exitSidenoteCall,
			sidenoteDefinitionLabelString: exitSidenoteDefinitionLabelString,
			sidenoteDefinition: exitSidenoteDefinition
		}
	}
}

export function remarkSidenoteSyntax(this: Processor) {
	const data = this.data() as Data & {
		micromarkExtensions?: MicromarkExtension[]
		fromMarkdownExtensions?: FromMarkdownExtension[]
	}

	const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = [])
	const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])

	micromarkExtensions.push(sidenoteSyntax())
	fromMarkdownExtensions.push(sidenoteFromMarkdown())
}

export const remarkResolveSidenotes = () => {
	return (tree: Mdast.Root) => {
		const definitions = new Map<string, Mdast.RootContent[]>()
		const definitionsToRemove = new Set<Mdast.RootContent>()
		let referenceId = 0

		visit(tree, 'sidenoteDefinition', (node) => {
			definitions.set(node.identifier, node.children)
			definitionsToRemove.add(node)
		})

		tree.children = tree.children.filter((child) => !definitionsToRemove.has(child))

		visit(tree, 'sidenoteReference', (node, index, parent) => {
			if (!parent || typeof index !== 'number') return undefined

			const id = node.identifier
			const definitionChildren = definitions.get(id)
			if (!definitionChildren) return undefined

			const paragraph =
				definitionChildren.length === 1 && definitionChildren[0].type === 'paragraph'
					? definitionChildren[0]
					: undefined

			const note: Sidenote = {
				type: 'sidenote',
				data: { noteId: id, referenceId: ++referenceId, inline: Boolean(paragraph) },
				children: paragraph?.children ?? definitionChildren
			}
			parent.children.splice(index, 1, note)
			return [SKIP, index]
		})
	}
}
