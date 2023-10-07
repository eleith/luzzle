import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { merge } from 'lodash-es'
import { Pieces, PieceArgv } from '../pieces/index.js'
import { BookPiece } from '../../pieces/books/index.js'

type FetchServices = 'google' | 'openlibrary' | 'openai' | 'all'

export type FetchArgv = {
	service: FetchServices
} & PieceArgv

const command: Command<FetchArgv> = {
	name: 'fetch',

	command: `fetch ${Pieces.COMMAND} [service]`,

	describe: 'fetch metadata for piece with [google|openlibrary|openai|all]',

	builder: <FetchArgv>(yargs: Argv<FetchArgv>) => {
		return Pieces.command(yargs).option('service', {
			type: 'string',
			description: 'fetch metadata with a specific service',
			choices: ['google', 'openlibrary', 'openai', 'all'],
			default: 'all' as FetchServices,
		})
	},

	run: async function (ctx, args) {
		const dir = ctx.directory
		const { slug } = Pieces.parseArgv(args)
		const bookPiece = new BookPiece(dir)
		const bookMd = await bookPiece.get(slug)
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
					const googleMetadata = await bookPiece.searchGoogleBooks(
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
					const openLibraryMetadata = await bookPiece.searchOpenLibrary(
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
					const openAIBook = await bookPiece.completeOpenAI(openAIKey, bookMd)
					merge(bookProcessed, { frontmatter: openAIBook })
				} else {
					log.warn('openai key is not set, tags and description will not be generated')
				}
			}

			await bookPiece.write(slug, bookProcessed)
		}

		log.info(`processed ${bookMd.filename}`)
	},
}

export default command
