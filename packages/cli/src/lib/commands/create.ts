import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { PieceType, PieceTypes } from '../pieces/index.js'
import slugify from '@sindresorhus/slugify'
import { BookPiece } from '../../pieces/books/index.js'

export type CreateArgv = { piece: PieceType; title: string }

const command: Command<CreateArgv> = {
	name: 'create',

	command: `create <title>`,

	describe: 'create a new piece',

	builder: <T>(yargs: Argv<T>) => {
		return yargs
			.option('piece', {
				type: 'string',
				alias: 'p',
				description: `piece type`,
				choices: Object.values(PieceTypes),
				demandOption: `piece is required`,
			})
			.positional('title', {
				type: 'string',
				description: `title of piece`,
				demandOption: `title is required`,
			}) as Argv<T & CreateArgv>
	},

	run: async function (ctx, args) {
		const dir = ctx.directory
		const { title } = args
		const slug = slugify(title)
		const bookPiece = new BookPiece(dir)

		if (bookPiece.exists(slug)) {
			log.error(`book already exists at ${bookPiece.getFileName(slug)}`)
			return
		}

		if (ctx.flags.dryRun === false) {
			const markdown = bookPiece.create(slug, 'markdown notes', {
				title,
				author: 'author',
				isbn: '1234',
				description: 'description',
				id_ol_book: 'id1234',
				id_ol_work: 'id5678',
				coauthors: 'coauthors',
				year_read: new Date().getFullYear(),
				month_read: new Date().getMonth() + 1,
			})
			bookPiece.write(slug, markdown)
			log.info(`created new book at ${bookPiece.getFileName(slug)}`)
		} else {
			log.info(`created new book at ${slugify(title)}.md`)
		}
	},
}

export default command
