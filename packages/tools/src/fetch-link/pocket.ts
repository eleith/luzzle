import got from 'got'

interface PocketList {
	item_id: string
	resolved_id: string
	given_url: string
	resolved_url: string
	given_title: string
	resolved_title: string
	favorite: string
	status: string
	excerpt: string
	is_article: string
	has_video: string
	has_image: string
	word_count: string
	top_image_url: string
	time_added: string
	time_read: string
}

interface PocketListResponse {
	status: number
	complete: number
	list: { [key: string]: PocketList }
	error: string
	search_meta: { total_result_count: number; has_more: boolean }
}

interface Link {
	title: string
	url: string
	representative_image?: string
	type: 'article' | 'bookmark'
	word_count?: number
	date_accessed: string
	date_published: string
}

const pocketApi = 'https://getpocket.com/v3'

async function getItemByUrl(pocket: { key: string; token: string }, url: string) {
	const uri = new URL(url)
	const response = await got
		.post(`${pocketApi}/get`, {
			json: {
				consumer_key: pocket.key,
				access_token: pocket.token,
				detailType: 'complete',
				domain: uri.hostname,
				count: 100,
				sort: 'newest',
			},
			headers: {
				Accept: '*/*',
				'Content-Type': 'application/json',
			},
		})
		.json<PocketListResponse>()

	const result = {} as Link

	const item = Object.values(response.list).find((item) => {
		const itemResolvedUri = new URL(item.resolved_url)
		const itemGivenUri = new URL(item.given_url)
		return (
			uri.href === itemResolvedUri.href ||
			uri.href === itemGivenUri.href ||
			uri.pathname === itemResolvedUri.pathname ||
			uri.pathname === itemGivenUri.pathname
		)
	})

	if (item) {
		result.title = item.resolved_title
		result.url = item.resolved_url
		result.type = item.is_article === '1' ? 'article' : 'bookmark'

		if (item.top_image_url) {
			result.representative_image = item.top_image_url
		}

		if (item.word_count) {
			result.word_count = parseInt(item.word_count)
		}

		result.date_accessed = new Date(parseInt(item.time_read) * 1000).toLocaleDateString()
		result.date_published = new Date(parseInt(item.time_added) * 1000).toLocaleDateString()
	}

	return result
}

export { getItemByUrl }
