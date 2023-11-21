import { Feed, Item } from 'feed'
import { writeFile, mkdir } from 'fs/promises'
import { loadEnvConfig } from '@next/env'
import { getDatabaseClient, Book } from '@luzzle/kysely'

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

async function generateRss(books: Book[], type: string) {
	const feed = new Feed({
		title: process.env.TITLE || '',
		description: process.env.DESCRIPTION,
		id: `${process.env.NEXT_PUBLIC_HOST}/${type}`,
		link: process.env.NEXT_PUBLIC_HOST,
		ttl: 60 * 24,
		// image,
		// favicon,
		updated: new Date(),
		generator: 'jpmonette/feed',
		language: 'en',
		copyright: `© ${new Date().getFullYear()}`,
		feedLinks: {
			rss2: `${process.env.NEXT_PUBLIC_HOST}/rss/${type}/feed.xml`,
			json: `${process.env.NEXT_PUBLIC_HOST}/rss/${type}/feed.json`,
		},
		// author: {
		//   name: '',
		//   email: '',
		//   link: '',
		// },
	})

	const items = books?.map((book) => {
		return {
			title: book.title,
			author: [{ name: book.author }],
			link: `${process.env.NEXT_PUBLIC_HOST}/books/${book.slug}`,
			image: book.cover_width
				? `${process.env.NEXT_PUBLIC_HOST_STATIC}/images/variants/books/covers/${book.slug}.w500.jpg`
				: undefined,
			description: book.description || '',
			content: book.description || '',
			date: new Date(`${book.year_read || 2000}-${book.month_read || 1}`),
		} as Item
	})

	items.forEach((item) => {
		feed.addItem(item)
	})

	await mkdir(`./public/rss/${type}`, { recursive: true })

	// https://github.com/jpmonette/feed/issues/140
	await writeFile(
		`./public/rss/${type}/feed.xml`,
		feed
			.rss2()
			.replace(
				'<?xml version="1.0" encoding="utf-8"?>',
				`<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="../feed.xslt"?>`
			)
	)
}

async function main() {
	const db = getDatabaseClient(`${process.env.LUZZLE_FOLDER}/luzzle.sqlite`)
	const books = await db
		.selectFrom('books')
		.limit(50)
		.orderBy('date_added', 'desc')
		.selectAll()
		.execute()

	generateRss(books, 'books')
}

main()
	.catch((err) => {
		console.error(err)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: rss generation')
	})
