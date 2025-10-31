import { Root } from 'mdast';
import { remark } from 'remark'
import remarkFrontMatter from 'remark-frontmatter'
import { visit } from 'unist-util-visit'
import YAML from 'yaml'

async function extractFullMarkdown(
	contents: string | Buffer
): Promise<{ frontmatter: { [key: string]: unknown }; markdown: string }> {
	let frontmatter = {}
	let markdown = contents.toString()

	await remark()
		.use(remarkFrontMatter)
		.use(() => (tree: Root) => {
			visit(tree, 'yaml', function (node) {
				frontmatter = YAML.parse(node.value)
				const endPosition = node.position?.end.offset
				markdown = markdown.slice(endPosition).trim()
			})
		})
		.process(contents)

	return { frontmatter, markdown }
}

export { extractFullMarkdown }
