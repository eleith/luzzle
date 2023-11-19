import { Feed, Item } from 'feed'
import fs from 'fs'
import { loadEnvConfig } from '@next/env'
import { getDatabaseClient } from '@luzzle/kysely'

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

function generateRss(items: Item[], type: string) {
	const feed = new Feed({
		title: process.env.SITE_TITLE || '',
		description: process.env.SITE_DESCRIPTION,
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

	items.forEach((item) => {
		feed.addItem(item)
	})

	fs.mkdirSync(`./public/rss/${type}`, { recursive: true })
	// https://github.com/jpmonette/feed/issues/140
	fs.writeFileSync(
		`./public/rss/${type}/feed.xml`,
		feed
			.rss2()
			.replace(
				'<?xml version="1.0" encoding="utf-8"?>',
				'<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="/rss/feed.xslt"?>'
			)
	)
	fs.writeFileSync(`./public/rss/${type}/feed.json`, feed.json1())
}

async function main() {
	const db = getDatabaseClient(process.env.DATABASE_URL as string)
	const books = await db
		.selectFrom('books')
		.where('date_added', '>=', Date.now())
		.limit(50)
		.selectAll()
		.execute()

	const booksFeed = books?.map((book) => {
		return {
			title: book.title,
			author: [{ name: book.author }],
			link: `${process.env.NEXT_PUBLIC_HOST}/books/${book.slug}`,
			image: book.cover_width
				? `${process.env.NEXT_PUBLIC_HOST_STATIC}/images/covers-thumbs/${book.slug}.w500.jpg`
				: undefined,
			description: book.description || '',
			content: book.description || '',
			date: new Date(`${book.year_read || 2000}-${book.month_read || 1}`),
		}
	})

	generateRss(booksFeed, 'books')
}

main()
	.catch((err) => {
		console.error(err)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: rss generation')
	})
