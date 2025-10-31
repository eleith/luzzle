import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkGemoji from 'remark-gemoji'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkGemoji)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings)
	.use(rehypePrettyCode, { theme: { light: 'gruvbox-light-medium', dark: 'gruvbox-dark-medium' } })
	.use(rehypeStringify)

export async function processMarkdown(markdown: string) {
	const file = await processor.process(markdown)
	return String(file)
}
