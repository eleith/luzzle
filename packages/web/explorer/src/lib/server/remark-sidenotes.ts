import { visit, SKIP } from 'unist-util-visit'
import { h } from 'hastscript'
import type { Handler } from 'mdast-util-to-hast'
import type { Processor, Data } from 'unified'
import type {
	TokenizeContext,
	Effects,
	State,
	Code,
	Token,
	Event,
	Extension as MicromarkExtension
} from 'micromark-util-types'
import type { CompileContext, Extension as FromMarkdownExtension } from 'mdast-util-from-markdown'
import { blankLine } from 'micromark-core-commonmark'
import { factorySpace } from 'micromark-factory-space'
import { markdownLineEndingOrSpace } from 'micromark-util-character'
import { normalizeIdentifier } from 'micromark-util-normalize-identifier'
import { codes, constants, types } from 'micromark-util-symbol'
import { ok as assert } from 'devlop'

declare module 'micromark-util-types' {
	interface TokenTypeMap {
		sidenoteCall: 'sidenoteCall'
		sidenoteCallLabelMarker: 'sidenoteCallLabelMarker'
		sidenoteCallMarker: 'sidenoteCallMarker'
		sidenoteCallString: 'sidenoteCallString'
		sidenoteDefinition: 'sidenoteDefinition'
		sidenoteDefinitionIndent: 'sidenoteDefinitionIndent'
		sidenoteDefinitionLabel: 'sidenoteDefinitionLabel'
		sidenoteDefinitionLabelMarker: 'sidenoteDefinitionLabelMarker'
		sidenoteDefinitionLabelString: 'sidenoteDefinitionLabelString'
		sidenoteDefinitionMarker: 'sidenoteDefinitionMarker'
		sidenoteDefinitionWhitespace: 'sidenoteDefinitionWhitespace'
	}

	interface ParseContext {
		sidenotes?: string[]
	}
}

import type * as Mdast from 'mdast'

interface SidenoteReference extends Mdast.Node {
	type: 'sidenoteReference'
	identifier: string
	label: string
}

interface SidenoteDefinition extends Mdast.Parent {
	type: 'sidenoteDefinition'
	identifier: string
	label: string
	children: Array<Mdast.RootContent>
}

interface Sidenote extends Mdast.Parent {
	type: 'sidenote'
	data?: Mdast.Data & { noteId: string }
	children: Array<Mdast.RootContent>
}

declare module 'mdast' {
	interface RootContentMap {
		sidenoteDefinition: SidenoteDefinition
		sidenote: Sidenote
	}
	interface PhrasingContentMap {
		sidenoteReference: SidenoteReference
		sidenote: Sidenote
	}
}

// Micromark extension
const indent = { tokenize: tokenizeIndent, partial: true }

function sidenoteSyntax(): MicromarkExtension {
	return {
		document: {
			[codes.leftSquareBracket]: {
				name: 'sidenoteDefinition',
				tokenize: tokenizeDefinitionStart,
				continuation: { tokenize: tokenizeDefinitionContinuation },
				exit: sidenoteDefinitionEnd
			}
		},
		text: {
			[codes.leftSquareBracket]: {
				name: 'sidenoteCall',
				tokenize: tokenizeSidenoteCall
			},
			[codes.rightSquareBracket]: {
				name: 'potentialSidenoteCall',
				add: 'after',
				tokenize: tokenizePotentialSidenoteCall,
				resolveTo: resolveToPotentialSidenoteCall
			}
		}
	}
}

function tokenizePotentialSidenoteCall(
	this: TokenizeContext,
	effects: Effects,
	ok: State,
	nok: State
) {
	// eslint-disable-next-line @typescript-eslint/no-this-alias
	const self = this
	let index = self.events.length
	const defined = self.parser.sidenotes || (self.parser.sidenotes = [])
	let labelStart: Token | undefined

	while (index--) {
		const token = self.events[index][1]

		if (token.type === types.labelImage) {
			labelStart = token
			break
		}

		if (
			token.type === 'sidenoteCall' ||
			token.type === types.labelLink ||
			token.type === types.label ||
			token.type === types.image ||
			token.type === types.link
		) {
			break
		}
	}

	return start

	function start(code: Code) {
		assert(code === codes.rightSquareBracket, 'expected `]`')

		if (!labelStart || !labelStart._balanced) {
			return nok(code)
		}

		const id = normalizeIdentifier(self.sliceSerialize({ start: labelStart.end, end: self.now() }))

		if (id.codePointAt(0) !== codes.caret || !defined.includes(id.slice(1))) {
			return nok(code)
		}

		effects.enter('sidenoteCallLabelMarker')
		effects.consume(code)
		effects.exit('sidenoteCallLabelMarker')
		return ok(code)
	}
}

function resolveToPotentialSidenoteCall(events: Event[], context: TokenizeContext) {
	let index = events.length
	let labelStart: Token | undefined

	while (index--) {
		if (events[index][1].type === types.labelImage && events[index][0] === 'enter') {
			labelStart = events[index][1]
			break
		}
	}

	assert(labelStart, 'expected `labelStart` to resolve')

	events[index + 1][1].type = types.data
	events[index + 3][1].type = 'sidenoteCallLabelMarker'

	const call = {
		type: 'sidenoteCall',
		start: Object.assign({}, events[index + 3][1].start),
		end: Object.assign({}, events[events.length - 1][1].end)
	}
	const marker = {
		type: 'sidenoteCallMarker',
		start: Object.assign({}, events[index + 3][1].end),
		end: Object.assign({}, events[index + 3][1].end)
	}
	marker.end.column++
	marker.end.offset++
	marker.end._bufferIndex++
	const string = {
		type: 'sidenoteCallString',
		start: Object.assign({}, marker.end),
		end: Object.assign({}, events[events.length - 1][1].start)
	}
	const chunk = {
		type: types.chunkString,
		contentType: 'string',
		start: Object.assign({}, string.start),
		end: Object.assign({}, string.end)
	}

	const replacement: Event[] = [
		events[index + 1],
		events[index + 2],
		['enter', call as Token, context],
		events[index + 3],
		events[index + 4],
		['enter', marker as Token, context],
		['exit', marker as Token, context],
		['enter', string as Token, context],
		['enter', chunk as Token, context],
		['exit', chunk as Token, context],
		['exit', string as Token, context],
		events[events.length - 2],
		events[events.length - 1],
		['exit', call as Token, context]
	]

	events.splice(index, events.length - index + 1, ...replacement)

	return events
}

function tokenizeSidenoteCall(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
	//const self = this
	//const defined = self.parser.sidenotes || (self.parser.sidenotes = [])
	let size = 0
	let data: boolean

	return start

	function start(code: Code) {
		assert(code === codes.leftSquareBracket, 'expected `[`')
		effects.enter('sidenoteCall')
		effects.enter('sidenoteCallLabelMarker')
		effects.consume(code)
		effects.exit('sidenoteCallLabelMarker')
		return callStart
	}

	function callStart(code: Code) {
		if (code !== codes.caret) return nok(code)

		effects.enter('sidenoteCallMarker')
		effects.consume(code)
		effects.exit('sidenoteCallMarker')
		effects.enter('sidenoteCallString')
		effects.enter('chunkString').contentType = 'string'
		return callData
	}

	function callData(code: Code) {
		if (
			size > constants.linkReferenceSizeMax ||
			(code === codes.rightSquareBracket && !data) ||
			code === codes.eof ||
			code === codes.leftSquareBracket ||
			markdownLineEndingOrSpace(code)
		) {
			return nok(code)
		}

		if (code === codes.rightSquareBracket) {
			effects.exit('chunkString')
			effects.exit('sidenoteCallString')

			effects.enter('sidenoteCallLabelMarker')
			effects.consume(code)
			effects.exit('sidenoteCallLabelMarker')
			effects.exit('sidenoteCall')
			return ok
		}

		if (!markdownLineEndingOrSpace(code)) {
			data = true
		}

		size++
		effects.consume(code)
		return code === codes.backslash ? callEscape : callData
	}

	function callEscape(code: Code) {
		if (
			code === codes.leftSquareBracket ||
			code === codes.backslash ||
			code === codes.rightSquareBracket
		) {
			effects.consume(code)
			size++
			return callData
		}

		return callData(code)
	}
}

function tokenizeDefinitionStart(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
	// eslint-disable-next-line @typescript-eslint/no-this-alias
	const self = this
	const defined = self.parser.sidenotes || (self.parser.sidenotes = [])
	let identifier: string
	let size = 0
	let data: boolean | undefined

	return start

	function start(code: Code) {
		assert(code === codes.leftSquareBracket, 'expected `[`')
		effects.enter('sidenoteDefinition')._container = true
		effects.enter('sidenoteDefinitionLabel')
		effects.enter('sidenoteDefinitionLabelMarker')
		effects.consume(code)
		effects.exit('sidenoteDefinitionLabelMarker')
		return labelAtMarker
	}

	function labelAtMarker(code: Code) {
		if (code === codes.caret) {
			effects.enter('sidenoteDefinitionMarker')
			effects.consume(code)
			effects.exit('sidenoteDefinitionMarker')
			effects.enter('sidenoteDefinitionLabelString')
			effects.enter('chunkString').contentType = 'string'
			return labelInside
		}

		return nok(code)
	}

	function labelInside(code: Code) {
		if (
			size > constants.linkReferenceSizeMax ||
			(code === codes.rightSquareBracket && !data) ||
			code === codes.eof ||
			code === codes.leftSquareBracket ||
			markdownLineEndingOrSpace(code)
		) {
			return nok(code)
		}

		if (code === codes.rightSquareBracket) {
			effects.exit('chunkString')
			const token = effects.exit('sidenoteDefinitionLabelString')
			identifier = normalizeIdentifier(self.sliceSerialize(token))
			effects.enter('sidenoteDefinitionLabelMarker')
			effects.consume(code)
			effects.exit('sidenoteDefinitionLabelMarker')
			effects.exit('sidenoteDefinitionLabel')
			return labelAfter
		}

		if (!markdownLineEndingOrSpace(code)) {
			data = true
		}

		size++
		effects.consume(code)
		return code === codes.backslash ? labelEscape : labelInside
	}

	function labelEscape(code: Code) {
		if (
			code === codes.leftSquareBracket ||
			code === codes.backslash ||
			code === codes.rightSquareBracket
		) {
			effects.consume(code)
			size++
			return labelInside
		}

		return labelInside(code)
	}

	function labelAfter(code: Code) {
		if (code === codes.colon) {
			effects.enter('definitionMarker')
			effects.consume(code)
			effects.exit('definitionMarker')

			if (!defined.includes(identifier)) {
				defined.push(identifier)
			}

			return factorySpace(effects, whitespaceAfter, 'sidenoteDefinitionWhitespace')
		}

		return nok(code)
	}

	function whitespaceAfter(code: Code) {
		return ok(code)
	}
}

function tokenizeDefinitionContinuation(effects: Effects, ok: State, nok: State) {
	return effects.check(blankLine, ok, effects.attempt(indent, ok, nok))
}

function sidenoteDefinitionEnd(this: TokenizeContext, effects: Effects): undefined {
	effects.exit('sidenoteDefinition')
}

function tokenizeIndent(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
	// eslint-disable-next-line @typescript-eslint/no-this-alias
	const self = this

	return factorySpace(effects, afterPrefix, 'sidenoteDefinitionIndent', constants.tabSize + 1)

	function afterPrefix(code: Code) {
		const tail = self.events[self.events.length - 1]
		return tail &&
			tail[1].type === 'sidenoteDefinitionIndent' &&
			tail[2].sliceSerialize(tail[1], true).length === constants.tabSize
			? ok(code)
			: nok(code)
	}
}

// Mdast extension
function enterSidenoteCallString(this: CompileContext) {
	this.buffer()
}

function enterSidenoteCall(this: CompileContext, token: Token) {
	this.enter(
		{
			type: 'sidenoteReference' as 'linkReference',
			identifier: '',
			label: '',
			children: [],
			referenceType: 'shortcut'
		} as Mdast.Nodes,
		token
	)
}

function enterSidenoteDefinitionLabelString(this: CompileContext) {
	this.buffer()
}

function enterSidenoteDefinition(this: CompileContext, token: Token) {
	this.enter(
		{ type: 'sidenoteDefinition', identifier: '', label: '', children: [] } as Mdast.Nodes,
		token
	)
}

function exitSidenoteCallString(this: CompileContext, token: Token) {
	const label = this.resume()
	const node = this.stack[this.stack.length - 1] as unknown as SidenoteReference
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

// Remark plugin
export function remarkSidenote(this: Processor) {
	const data = this.data() as Data & {
		micromarkExtensions?: MicromarkExtension[]
		fromMarkdownExtensions?: FromMarkdownExtension[]
	}

	const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = [])
	const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])

	micromarkExtensions.push(sidenoteSyntax())
	fromMarkdownExtensions.push(sidenoteFromMarkdown())
}

export const remarkSidenotesUnified = () => {
	return (tree: Mdast.Root) => {
		const definitions = new Map<string, Mdast.RootContent[]>()
		const nodesToRemove: SidenoteDefinition[] = []

		visit(tree, 'sidenoteDefinition', (node: SidenoteDefinition) => {
			definitions.set(node.identifier, node.children)
			nodesToRemove.push(node)
		})

		tree.children = tree.children.filter(
			(child) => !nodesToRemove.includes(child as SidenoteDefinition)
		)

		visit(
			tree,
			'sidenoteReference',
			(node, index, parent) => {
				if (!parent || typeof index !== 'number') return

				const id = node.identifier
				if (definitions.has(id)) {
					const definitionChildren = definitions.get(id)
					if (!definitionChildren) return

					const content =
						definitionChildren.length === 1 && definitionChildren[0].type === 'paragraph'
							? definitionChildren[0].children
							: definitionChildren

					parent.children.splice(index, 1, {
						type: 'sidenote',
						data: { noteId: id },
						children: content
					} as Sidenote)
					return [SKIP, index]
				}
			}
		)
	}
}

export const sidenoteHandler: Handler = (state, node) => {
	const data = (node as Sidenote).data
	const noteId = data?.noteId
	const type = 'sidenote'
	const checkboxId = `tufte-sn-${noteId}`

	return h('span', { className: type }, [
		h('input', {
			'aria-label': `Show ${type}`,
			type: 'checkbox',
			id: checkboxId,
			className: 'sidenote__checkbox'
		}),
		h(
			'label',
			{
				tabIndex: 0,
				title: `${type} content`,
				'aria-describedby': `${type}-${noteId}`,
				'anchor-name': `--${type}-label-${noteId}`,
				className: 'sidenote__button',
				for: checkboxId
			},
			[h('sup', noteId)]
		),
		h(
			'small',
			{
				id: `${type}-${noteId}`,
				style: `position-anchor:--${type}-label-${noteId};`,
				className: 'sidenote__content'
			},
			[h('span', { className: 'sidenote__id' }, noteId), h('span', {}, state.all(node))]
		)
	])
}
