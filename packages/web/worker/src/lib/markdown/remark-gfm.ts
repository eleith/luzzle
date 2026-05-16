import type { Processor, Plugin, Data } from 'unified'
import type { Options as MicromarkStrikethroughOptions } from 'micromark-extension-gfm-strikethrough'
import type { Options as MdastTableOptions } from 'mdast-util-gfm-table'
import type { Extension as MicromarkExtension } from 'micromark-util-types'
import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown'
import type { Options as ToMarkdownExtension } from 'mdast-util-to-markdown'
import {
	gfmAutolinkLiteralFromMarkdown,
	gfmAutolinkLiteralToMarkdown
} from 'mdast-util-gfm-autolink-literal'
import { gfmFootnoteFromMarkdown, gfmFootnoteToMarkdown } from 'mdast-util-gfm-footnote'
import {
	gfmStrikethroughFromMarkdown,
	gfmStrikethroughToMarkdown
} from 'mdast-util-gfm-strikethrough'
import { gfmTableFromMarkdown, gfmTableToMarkdown } from 'mdast-util-gfm-table'
import {
	gfmTaskListItemFromMarkdown,
	gfmTaskListItemToMarkdown
} from 'mdast-util-gfm-task-list-item'

import { gfmAutolinkLiteral } from 'micromark-extension-gfm-autolink-literal'
import { gfmFootnote } from 'micromark-extension-gfm-footnote'
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough'
import { gfmTable } from 'micromark-extension-gfm-table'
import { gfmTaskListItem } from 'micromark-extension-gfm-task-list-item'

interface PluginOptions {
	autolinkLiteral?: boolean
	footnote?: boolean
	strikethrough?: boolean
	table?: boolean
	tasklist?: boolean
}

export type Options = MicromarkStrikethroughOptions &
	MdastTableOptions & { plugins?: PluginOptions }

const emptyOptions: Options = {}

const remarkGfm: Plugin<[Options?]> = function (this: Processor, options?: Options) {
	const data = this.data() as Data & {
		micromarkExtensions?: MicromarkExtension[]
		fromMarkdownExtensions?: FromMarkdownExtension[]
		toMarkdownExtensions?: ToMarkdownExtension[]
	}
	const pluginOptions: PluginOptions = {
		...{ autolinkLiteral: true, footnote: true, strikethrough: true, table: true, tasklist: true },
		...options?.plugins
	}
	const extOptions: Options = { ...emptyOptions, ...options }

	const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = [])
	const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
	const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

	if (pluginOptions.autolinkLiteral) {
		micromarkExtensions.push(gfmAutolinkLiteral())
		fromMarkdownExtensions.push(gfmAutolinkLiteralFromMarkdown())
		toMarkdownExtensions.push(gfmAutolinkLiteralToMarkdown())
	}

	if (pluginOptions.footnote) {
		micromarkExtensions.push(gfmFootnote())
		fromMarkdownExtensions.push(gfmFootnoteFromMarkdown())
		toMarkdownExtensions.push(gfmFootnoteToMarkdown())
	}

	if (pluginOptions.strikethrough) {
		micromarkExtensions.push(gfmStrikethrough(extOptions))
		fromMarkdownExtensions.push(gfmStrikethroughFromMarkdown())
		toMarkdownExtensions.push(gfmStrikethroughToMarkdown())
	}

	if (pluginOptions.table) {
		micromarkExtensions.push(gfmTable())
		fromMarkdownExtensions.push(gfmTableFromMarkdown())
		toMarkdownExtensions.push(gfmTableToMarkdown(extOptions))
	}

	if (pluginOptions.tasklist) {
		micromarkExtensions.push(gfmTaskListItem())
		fromMarkdownExtensions.push(gfmTaskListItemFromMarkdown())
		toMarkdownExtensions.push(gfmTaskListItemToMarkdown())
	}
}

export default remarkGfm
