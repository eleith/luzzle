import * as ReactDOMServer from 'react-dom/server'
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'

export default async function jsx2md(jsx: JSX.Element): Promise<string> {
	const htmlString = ReactDOMServer.renderToStaticMarkup(jsx)

	const markdown = await unified()
		.use(rehypeParse)
		.use(rehypeRemark)
		.use(remarkStringify)
		.process(htmlString)

	return markdown.toString()
}
