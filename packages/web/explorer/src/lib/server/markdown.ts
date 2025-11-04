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
import { config } from '$lib/server/config.js'

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
			sidenote: sidenoteHandler
		}
	})
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings)
	.use(rehypePrettyCode, {
		theme: {
			light: config.theme.markdown.code.light,
			dark: config.theme.markdown.code.dark
		}
	})
	.use(rehypeStringify, { allowDangerousHtml: true })

export async function processMarkdown(markdown: string) {
	const file = await processor.process(markdown)
	return String(file)
}
