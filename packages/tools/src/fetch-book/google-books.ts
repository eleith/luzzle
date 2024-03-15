import { books_v1, books } from '@googleapis/books'

function _getGoogleBooks(googleBooksApiKey: string): books_v1.Books {
	return books({ version: 'v1', auth: googleBooksApiKey })
}

async function findVolumeByIsbn(
	googleBooksApiKey: string,
	isbn: string
): Promise<books_v1.Schema$Volume | null> {
	const googleBooks = _private._getGoogleBooks(googleBooksApiKey)
	const response = await googleBooks.volumes.list({ q: `isbn:${isbn}` })

	if (response.status === 200 && response.data.items?.length) {
		return response.data.items[0]
	}
	return null
}

async function findVolumes(
	googleBooksApiKey: string,
	title: string,
	author: string
): Promise<books_v1.Schema$Volume[] | null> {
	const googleBooks = _private._getGoogleBooks(googleBooksApiKey)
	const response = await googleBooks.volumes.list({ q: `${title} ${author}` })

	if (response.status === 200 && response.data.items?.length) {
		return response.data.items
	}

	return null
}

async function findVolume(
	googleBooksApiKey: string,
	title: string,
	author: string
): Promise<books_v1.Schema$Volume | null> {
	const books = await findVolumes(googleBooksApiKey, title, author)
	return books?.[0] || null
}

const _private = {
	_getGoogleBooks,
}

export { findVolumeByIsbn, findVolumes, findVolume, _private }
