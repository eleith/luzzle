#! /usr/bin/env node

import { findVolume } from './google-books.js'
import { getBook, findWork, getCoverUrl } from './open-library.js'
import { generateTags, generateDescription } from './openai.js'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'

async function completeOpenAI(apiKey: string, title: string, author: string, isbn?: string) {
	const tags = await generateTags(apiKey, title, author, isbn)
	const description = await generateDescription(apiKey, title, author, isbn)

	return { keywords: tags.join(', '), description }
}

async function searchGoogleBooks(apiKey: string, bookTitle: string, bookAuthor: string) {
	const volume = await findVolume(apiKey, bookTitle, bookAuthor)
	const googleBook = volume?.volumeInfo

	if (googleBook) {
		const title = googleBook.title || bookTitle
		const subtitle = googleBook.subtitle
		const authors = googleBook.authors || []
		const author = authors[0] || bookAuthor
		const coauthors = authors.slice(1).join(',')
		const categories = googleBook.categories || []
		const keywords = categories.map((x) => x.toLowerCase())
		const pages = googleBook.pageCount
		const description = googleBook.description

		const results = { title, author } as {
			title: string
			author: string
			subtitle?: string
			coauthors?: string
			pages?: number
			keywords?: string
			description?: string
		}

		if (subtitle) {
			results.subtitle = subtitle
		}

		if (coauthors) {
			results.coauthors = coauthors
		}

		if (pages && !isNaN(pages)) {
			results.pages = pages
		}

		if (keywords.length) {
			results.keywords = keywords.join(',')
		}

		if (description) {
			results.description = description
		}

		return results
	}

	throw new Error(`could not find ${bookTitle} on google books`)
}

async function searchOpenLibrary(openLibraryBookId: string, bookTitle: string, bookAuthor: string) {
	const book = await getBook(openLibraryBookId)
	const workId = book?.works?.[0].key.replace(/\/works\//, '')
	const work = workId ? await findWork(workId) : null

	if (book && work) {
		const title = work.title || bookTitle
		const subtitle = book.subtitle
		const author = work.author_name[0] || bookAuthor
		const coauthors = work.author_name.slice(1).join(',')
		const isbn = work.isbn?.[0]
		const publishedYear = work.first_publish_year
		const pages = Number(work.number_of_pages)
		const cover = work.cover_i ? getCoverUrl(work.cover_i) : undefined

		const results = { title, author } as {
			title: string
			author: string
			subtitle?: string
			coauthors?: string
			isbn?: string
			year_first_published?: number
			pages?: number
			cover?: string
			id_ol_work?: string
		}

		if (workId) {
			results.id_ol_work = workId
		}

		if (subtitle) {
			results.subtitle = subtitle
		}

		if (coauthors) {
			results.coauthors = coauthors
		}

		if (isbn) {
			results.isbn = isbn
		}

		if (publishedYear) {
			results.year_first_published = publishedYear
		}

		if (pages && !isNaN(pages)) {
			results.pages = pages
		}

		if (cover) {
			results.cover = cover
		}

		return results
	}

	throw new Error(`could not find ${bookTitle} on openlibrary`)
}

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const results: Record<string, string | number> = {}

		if (command.googleApiKey) {
			const googleResults = await searchGoogleBooks(
				command.googleApiKey,
				command.title,
				command.author
			)

			Object.entries(googleResults).forEach(([key, value]) => {
				results[key] = value
			})
		}

		if (command['openlibrary-book-id']) {
			const openLibraryResults = await searchOpenLibrary(
				command['openlibrary-book-id'],
				command.title,
				command.author
			)

			Object.entries(openLibraryResults).forEach(([key, value]) => {
				results[key] = value
			})
		}

		if (command.openaiApiKey) {
			const openaiResults = await completeOpenAI(
				command.openaiApiKey,
				command.title,
				command.author,
				command.isbn
			)

			Object.entries(openaiResults).forEach(([key, value]) => {
				results[key] = value
			})
		}

		Object.entries(results).forEach(([key, value]) => {
			console.log(key)
			console.log(value)
		})
	} catch (err) {
		console.error(err)
	}
}

run()
