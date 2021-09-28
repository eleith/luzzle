import yargs from 'yargs'
import { Prisma, PrismaClient, Book } from '@app/prisma'
import { promises, existsSync } from 'fs'
import { eachLimit } from 'async'
import path from 'path'
import { Transformer } from 'unified'
import { VisitorResult } from 'unist-util-visit'
import YAML from 'yaml'
import { Node } from 'mdast-util-to-markdown/lib'

const commands = yargs(process.argv.slice(2))
  .options({
    dir: {
      type: 'string',
      alias: 'd',
      description: 'directory to store book entries as md files',
      demandOption: true,
    },
  })
  .check((argv) => {
    if (argv.dir && !existsSync(argv.dir)) {
      throw new Error(`${argv.dir} does not exist`)
    }

    return true
  })
  .parseSync()

async function parseBookFromMarkdown(bookEntryFileName: string): Promise<Prisma.BookCreateInput> {
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

  function removeFrontMatter(): Transformer {
    const plugin: Transformer = (tree, vfile) => {
      const newTree = filter(tree, (node) => node.type !== 'yaml')
      vfile.data.content = newTree ? toMarkdown(newTree as Node) : ''
    }
    return plugin
  }

  const bookEntryContents = await promises.readFile(bookEntryFileName, 'utf-8')

  const { data } = await remark()
    .use(remarkFrontMatter)
    .use(extractFrontMatter)
    .use(removeFrontMatter)
    .process(bookEntryContents)

  return {
    ...(data.frontmatter as Omit<Prisma.BookCreateInput, 'note'>),
    note: data.content as string | null,
  }
}

async function isUpdated(filename: string, lastUpdated?: Date): Promise<boolean> {
  const stat = await promises.stat(filename)
  if (lastUpdated) {
    if (stat.mtime > lastUpdated) {
      return true
    }
    return false
  } else {
    return true
  }
}

async function run(command: typeof commands): Promise<void> {
  const prisma = new PrismaClient()
  const slugToDate = {} as { [key: string]: Date | undefined }
  const booksById = {} as { [key: string]: { book: Book; found: boolean } | undefined }
  const bookEntriesToUpdate = [] as Array<{ fromDb?: Book; fromMd: Prisma.BookCreateInput }>
  const books = await prisma.book.findMany()

  books.forEach((book) => {
    slugToDate[`${book.slug}.md`] = book.date_updated
    booksById[book.id] = { book, found: false }
  })

  const files = await promises.readdir(command.dir, { withFileTypes: true })
  const bookEntryFiles = files
    .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === '.md')
    .map((dirent) => path.basename(dirent.name))

  await eachLimit(bookEntryFiles, 20, async (filename) => {
    const updated = await isUpdated(path.join(command.dir, filename), slugToDate[filename])
    if (updated) {
      const fromMd = await parseBookFromMarkdown(path.join(command.dir, filename))
      const lookup = fromMd.id ? booksById[fromMd.id] : undefined
      bookEntriesToUpdate.push({ fromMd, fromDb: lookup?.book })
    }
  })

  await eachLimit(bookEntriesToUpdate, 1, async ({ fromMd, fromDb }) => {
    if (fromDb) {
      // compare data, validate data
      // update db with newer things
      // should abstract this and log out we are updating the book
      await prisma.book.update({ where: { id: fromDb.id }, data: fromMd })
    } else {
      // validate data
      // should abstract this and log out we are creating a new book
      await prisma.book.create({ data: fromMd })
    }

    // should rewrite data?
  })

  const booksToDelete = Object.keys(booksById).filter((id) => {
    booksById[id]?.found === false
  })

  await eachLimit(booksToDelete, 1, async (id) => {
    // should abstract this and log out we are deleating the book!
    await prisma.book.delete({ where: { id } })
  })

  await prisma.$disconnect()
}

run(commands).catch(console.error)
