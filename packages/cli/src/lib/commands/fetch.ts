import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import {
  getBook,
  writeBookMd,
  Books,
  completeOpenAI,
  searchGoogleBooks,
  searchOpenLibrary,
} from '../books/index.js'
import { parseSlugFromPath } from './utils/helpers.js'
import { merge } from 'lodash-es'

type FetchServices = 'google' | 'openlibrary' | 'openai' | 'all'

export type FetchArgv = {
  slug: string
  file: string
  service: FetchServices
}

const command: Command<FetchArgv> = {
  name: 'fetch',

  command: 'fetch <slug|file>',

  describe: 'fetch metadata for <slug|file> with [google|openlibrary|openai|all]',

  builder: <FetchArgv>(yargs: Argv<FetchArgv>) => {
    return yargs
      .positional('slug', {
        type: 'string',
        description: 'book slug',
        demandOption: 'slug (or file) is required',
      })
      .positional('file', {
        type: 'string',
        description: 'path to the book file',
        demandOption: 'file (or slug) is required',
      })
      .option('service', {
        type: 'string',
        description: 'fetch metadata with a specific service',
        choices: ['google', 'openlibrary', 'openai', 'all'],
        default: 'all' as FetchServices,
      })
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const slug = parseSlugFromPath(args.file) || args.slug
    const books = new Books(dir)
    const bookMd = await getBook(books, slug)
    const service = args.service

    if (!bookMd) {
      log.info(`${slug} was not found`)
      return
    }

    if (ctx.flags.dryRun === false) {
      const apiKeys = ctx.config.get('api_keys')
      const googleKey = apiKeys.google
      const openAIKey = apiKeys.openai
      const bookProcessed = merge({}, bookMd)

      if (/google|all/.test(service)) {
        if (googleKey) {
          const googleMetadata = await searchGoogleBooks(
            googleKey,
            bookMd.frontmatter.title,
            bookMd.frontmatter.author
          )
          merge(bookProcessed, { frontmatter: googleMetadata })
        } else {
          log.warn('google key is not set, google books metadata will not be fetched')
        }
      }

      if (/openlibrary|all/.test(service)) {
        if (bookProcessed.frontmatter.id_ol_book) {
          const openLibraryMetadata = await searchOpenLibrary(
            books,
            bookProcessed.frontmatter.id_ol_book,
            slug,
            bookProcessed.frontmatter.title,
            bookProcessed.frontmatter.author
          )
          merge(bookProcessed, { frontmatter: openLibraryMetadata })
        } else {
          log.warn('id_ol_book is not set, open library metadata will not be fetched')
        }
      }

      if (/openai|all/.test(service)) {
        if (openAIKey) {
          const openAIBook = await completeOpenAI(openAIKey, bookMd)
          merge(bookProcessed, { frontmatter: openAIBook })
        } else {
          log.warn('openai key is not set, tags and description will not be generated')
        }
      }

      await writeBookMd(books, bookProcessed)
    }

    log.info(`processed ${bookMd.filename}`)
  },
}

export default command
