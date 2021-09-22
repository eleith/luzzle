import yargs from 'yargs'
import { PrismaClient, Book } from '@prisma/client'
import yaml from 'yaml'
import { promises, existsSync } from 'fs'
import { eachLimit } from 'async'
import path from 'path'
import slugify from 'limax'

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

async function writeBookToMarkdown(dir: string, book: Book, prisma: PrismaClient): Promise<void> {
  const bookYamlObject: Partial<Book> = book
  const bookKeys = Object.keys(book) as Array<keyof Book>
  bookKeys.forEach((key) => {
    const bookAttribute = book[key]
    if (bookAttribute === null || bookAttribute === undefined) {
      delete bookYamlObject[key]
    }
  })
  let slug = slugify(book.title)
  let file = path.join(dir, `${slug}.md`)
  let year = book.year_first_published || 1

  if (existsSync(file)) {
    slug = slugify(`${book.title}--${year}`)
    file = path.join(dir, `${slug}.md`)
  }

  while (existsSync(file)) {
    year += 1
    slug = slugify(`${book.title}--${year}`)
    file = path.join(dir, `${slug}.md`)
  }

  const bookYaml = yaml.stringify({ ...bookYamlObject, slug })
  const frontMatterString = `---\n${bookYaml}---\n`

  console.log(`writing ${file} ...`)

  await prisma.book.update({ where: { id: book.id }, data: { slug } })
  await promises.writeFile(file, frontMatterString)
}

async function run(command: typeof commands): Promise<void> {
  const prisma = new PrismaClient()
  const books = await prisma.book.findMany()
  const cleanup = async (): Promise<void> => {
    await prisma.$disconnect()
  }
  const bookToMarkdown = async (book: Book): Promise<void> => {
    await writeBookToMarkdown(command.dir, book, prisma)
  }

  await eachLimit(books, 1, bookToMarkdown)
  cleanup()
}

run(commands).catch(console.error)
