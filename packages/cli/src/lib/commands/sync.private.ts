import log from '../log.js'
import { Context } from './utils/types.js'
import { difference } from 'lodash-es'
import { addTagsTo, removeAllTagsFrom, syncTagsFor, keywordsToTags } from '../tags/index.js'
import { Book, BookUpdate } from '@luzzle/kysely'
import { BookPiece } from '../books/index.js'
import { BookMarkDown } from '../books/book.schemas.js'

async function syncUpdateBookExecute(
	ctx: Context,
	piece: BookPiece,
	book: Book,
	bookUpdateInput: BookUpdate
): Promise<void> {
	try {
		if (ctx.flags.dryRun === false) {
			const bookUpdate = await ctx.db
				.updateTable('books')
				.set(bookUpdateInput)
				.where('id', '=', book.id)
				.returningAll()
				.executeTakeFirstOrThrow()

			if (bookUpdateInput?.keywords) {
				await syncTagsFor(ctx, keywordsToTags(bookUpdateInput.keywords), bookUpdate.id, 'books')
			}

			await piece.markBookAsSynced(bookUpdate)
		}

		log.info(`updated ${book.slug}`)
	} catch (err) {
		log.error(`${book.slug} could not be updated: ${err}`)
	}
}

async function syncAddBook(
	ctx: Context,
	slug: string,
	piece: BookPiece,
	bookMd: BookMarkDown
): Promise<void> {
	const maybeBook = await ctx.db
		.selectFrom('books')
		.selectAll()
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (maybeBook) {
		const bookUpdateInput = await piece.toUpdateInput(slug, bookMd, maybeBook)
		await syncUpdateBookExecute(ctx, piece, maybeBook, bookUpdateInput)
		return
	}

	try {
		if (ctx.flags.dryRun === false) {
			const bookCreateInput = await piece.toCreateInput(slug, bookMd)
			const bookAdded = await ctx.db
				.insertInto('books')
				.values(bookCreateInput)
				.returningAll()
				.executeTakeFirstOrThrow()

			if (bookAdded.keywords) {
				await addTagsTo(ctx, keywordsToTags(bookAdded.keywords), bookAdded.id, 'books')
			}

			await piece.markBookAsSynced(bookAdded)
		}
		log.info(`added ${bookMd.filename}`)
	} catch (err) {
		log.error(err as string)
	}
}

async function syncUpdateBook(
	ctx: Context,
	slug: string,
	piece: BookPiece,
	bookMd: BookMarkDown,
	force = false
): Promise<void> {
	const book = await ctx.db
		.selectFrom('books')
		.selectAll()
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (book) {
		const bookUpdateInput = await piece.toUpdateInput(slug, bookMd, book, force)
		await syncUpdateBookExecute(ctx, piece, book, bookUpdateInput)
		return
	}
}

async function syncRemoveBooksExecute(ctx: Context, ids: string[]): Promise<void> {
	try {
		if (ctx.flags.dryRun === false) {
			// we are leaving around assets and asset cache
			// unless we determine what they are and then remove them
			await ctx.db.deleteFrom('books').where('id', 'in', ids).execute()
			await removeAllTagsFrom(ctx, ids, 'books')
		}
		log.info(`deleted ${ids.length} book(s)`)
	} catch (err) {
		log.error(err as string)
	}
}

async function syncRemoveBooks(ctx: Context, diskSlugs: string[]): Promise<void> {
	const booksInDb = await ctx.db.selectFrom('books').select(['slug', 'id']).execute()
	const dbBookSlugs = booksInDb.map((book) => book.slug)
	const bookSlugsToRemove = difference(dbBookSlugs, diskSlugs)
	const bookIdsToRemove = booksInDb
		.filter((book) => bookSlugsToRemove.includes(book.slug))
		.map((book) => book.id)

	if (bookSlugsToRemove.length) {
		await syncRemoveBooksExecute(ctx, bookIdsToRemove)
	}
}

export { syncAddBook, syncUpdateBook, syncRemoveBooks }
