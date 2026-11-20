import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from './remark-gfm.js'
import { remarkSidenoteSyntax, remarkResolveSidenotes } from './remark-sidenotes.js'
import { sidenoteHandler, rehypePlaceSidenotes, rehypePresentSidenotes } from './sidenotes/html.js'
import { rehypeSidenoteHeadingIds } from './sidenotes/heading-ids.js'
import remarkGemoji from 'remark-gemoji'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import { rehypeTaskListLabels } from './rehype-task-list-labels.js'
import { rehypeAssetUrls, type AssetUrls } from './rehype-asset-urls.js'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'
import type { Config } from '@luzzle/web.config'

export type CodeThemes = Config['theme']['markdown']['code']

export async function processMarkdown(
	markdown: string,
	themes: CodeThemes,
	assets?: AssetUrls
): Promise<string> {
	const processor = unified()
		.use(remarkGfm, { plugins: { footnote: false } })
		.use(remarkSidenoteSyntax)
		.use(remarkParse)
		.use(remarkResolveSidenotes)
		.use(remarkGemoji)
		.use(remarkDirective)
		.use(remarkRehype, {
			allowDangerousHtml: true,
			handlers: {
				sidenote: sidenoteHandler,
			},
		})
		.use(rehypePrettyCode, { theme: themes })
		.use(rehypeRaw, { passThrough: ['sidenoteMarkup'] })
		.use(rehypePlaceSidenotes)
		.use(rehypeTaskListLabels)
		.use(rehypeAssetUrls, assets)
		.use(rehypeSidenoteHeadingIds)
		.use(rehypePresentSidenotes)
		.use(rehypeAutolinkHeadings)
		.use(rehypeStringify, { allowDangerousHtml: true })

	const file = await processor.process(markdown)
	const html = String(file)

	return `<section class="markdown">${html}</section>`
}
