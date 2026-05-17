import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from './remark-gfm.js'
import { remarkSidenote, remarkSidenotesUnified, sidenoteHandler } from './remark-sidenotes.js'
import remarkGemoji from 'remark-gemoji'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'
import type { Config } from '@luzzle/web.config'

export type CodeThemes = Config['theme']['markdown']['code']

export async function processMarkdown(markdown: string, themes: CodeThemes): Promise<string> {
	const processor = unified()
		.use(remarkGfm, { plugins: { footnote: false } })
		.use(remarkSidenote)
		.use(remarkParse)
		.use(remarkSidenotesUnified)
		.use(remarkGemoji)
		.use(remarkDirective)
		.use(remarkRehype, {
			allowDangerousHtml: true,
			handlers: {
				sidenote: sidenoteHandler,
			},
		})
		.use(rehypePrettyCode, { theme: themes })
		.use(rehypeRaw)
		.use(rehypeSlug)
		.use(rehypeAutolinkHeadings)
		.use(rehypeStringify, { allowDangerousHtml: true })

	const file = await processor.process(markdown)
	const html = String(file)

	return `<section class="markdown">${html}</section>`
}
