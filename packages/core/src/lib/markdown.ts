import { readFile } from 'fs/promises'
import { Transformer } from 'unified'
import { VisitorResult } from 'unist-util-visit'
import YAML from 'yaml'
import { remark } from 'remark'
import remarkFrontMatter from 'remark-frontmatter'
import { visit, EXIT } from 'unist-util-visit'
import { filter } from 'unist-util-filter'
import { toMarkdown } from 'mdast-util-to-markdown'
import { Nodes } from 'node_modules/mdast-util-to-markdown/lib/types.js'

async function extractFullMarkdown(
	path: string
): Promise<{ frontmatter: { [key: string]: unknown }; markdown: string }> {
	function extractFrontMatter(): Transformer {
		const transformer: Transformer = (tree, vfile) => {
			function visitor(node: { value: string }): VisitorResult {
				vfile.data.frontmatter = YAML.parse(node.value)
				return EXIT
			}

			visit(tree, 'yaml', visitor)
		}
		return transformer
	}

	function extractContent(): Transformer {
		const plugin: Transformer = (tree, vfile) => {
			const newTree = filter(tree, (node) => node.type !== 'yaml')
			vfile.data.content = newTree ? toMarkdown(newTree as Nodes) : ''
		}
		return plugin
	}

	const contents = await readFile(path, 'utf-8')

	const { data } = await remark()
		.use(remarkFrontMatter)
		.use(extractFrontMatter)
		.use(extractContent)
		.process(contents)

	const frontmatter = data.frontmatter as { [key: string]: unknown }
	const content = data.content as string
	const markdown = content.trimEnd()

	return { frontmatter, markdown }
}

export { extractFullMarkdown }
