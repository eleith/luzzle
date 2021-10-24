import { promises } from 'fs'
import { Transformer } from 'unified'
import { VisitorResult } from 'unist-util-visit'
import YAML from 'yaml'
import { Node } from 'mdast-util-to-markdown/lib'

function addFrontMatter(markdown = '', metadata: { [key: string]: unknown } = {}): string {
  const yamlString = YAML.stringify(metadata)
  const content = markdown.trim()

  return `---\n${yamlString}---\n${content}`
}

async function extract(path: string): Promise<{ frontmatter: unknown; markdown: string }> {
  const { remark } = await import('remark')
  const { default: remarkFrontMatter } = await import('remark-frontmatter')
  const { visit, EXIT } = await import('unist-util-visit')
  const { filter } = await import('unist-util-filter')
  const { toMarkdown } = await import('mdast-util-to-markdown')

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
      vfile.data.content = newTree ? toMarkdown(newTree as Node) : ''
    }
    return plugin
  }

  const contents = await promises.readFile(path, 'utf-8')

  const { data } = await remark()
    .use(remarkFrontMatter)
    .use(extractFrontMatter)
    .use(extractContent)
    .process(contents)

  return { frontmatter: data.frontmatter, markdown: data.content as string }
}

export { extract, addFrontMatter }
