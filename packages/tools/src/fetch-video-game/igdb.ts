import igdb from 'igdb-api-node'
import got from 'got'

async function getIgdbClient(clientID: string, secret: string) {
	const authResponse = await got.post<{ access_token: string }>(
		'https://id.twitch.tv/oauth2/token',
		{
			searchParams: {
				client_id: clientID,
				client_secret: secret,
				grant_type: 'client_credentials',
			},
			responseType: 'json',
		}
	)

	if (authResponse.statusCode !== 200) {
		throw new Error(`Failed to authenticate with IGDB. Status: ${authResponse.statusCode}`)
	}

	const token = authResponse.body.access_token

	return igdb.default(clientID, token)
}

async function getIgdb(client: ReturnType<typeof igdb.default>, id: string) {
	const response = await client
		.where(`id = ${id}`)
		.fields([
			'name',
			'websites.url',
			'game_modes.name',
			'summary',
			'themes.name',
			'cover.url',
			'genres.name',
			'keywords.name',
			'release_dates.date',
			'storyline',
			'involved_companies.company.name',
			'involved_companies.developer',
			'involved_companies.publisher',
		])
		.request('/games')

	if (response.status !== 200) {
		throw new Error(`Failed to fetch data from IGDB. Status: ${response}`)
	}

	const data = response.data[0] as {
		name: string
		websites?: { url: string }[]
		game_modes?: { name: string }[]
		summary?: string
		themes?: { name: string }[]
		cover?: { url: string }
		genres?: { name: string }[]
		keywords?: { name: string }[]
		release_dates?: { date: number }[]
		storyline?: string
		involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[]
	}

	const result = { title: data.name } as {
		title: string
		url?: string
		number_of_players?: number
		description: string
		representative_image?: string
		keywords?: string
		date_published?: string
		publisher?: string
		developer?: string
	}

	if (data.keywords || data.themes || data.genres) {
		const tags = [...(data.keywords || []), ...(data.themes || []), ...(data.genres || [])]
		result.keywords = tags
			.map((tag) => tag.name)
			.filter((name) => !name.startsWith('fan translation'))
			.join(', ')
	}

	if (data.release_dates) {
		const releaseDates = data.release_dates
			?.map((date) => new Date(date.date * 1000))
			.filter((date) => !isNaN(date.getDate()))
			.sort()
		if (releaseDates.length === 0) {
			const releaseDate = releaseDates[0]
			result.date_published = `${releaseDate.getFullYear()}/${releaseDate.getMonth() + 1}/${releaseDate.getDate()}`
		}
	}

	if (data.storyline || data.summary) {
		result.description = `${data.storyline || ''}\n\n${data.summary || ''}`
	}

	if (data.cover) {
		result.representative_image = `https:${data.cover.url.replace('t_thumb', 't_cover_big')}`
	}

	if (data.websites) {
		result.url = data.websites[0].url
	}

	if (data.game_modes) {
		result.number_of_players = data.game_modes.every((mode) => mode.name === 'Single player')
			? 1
			: 2
	}

	if (data.involved_companies) {
		const publishers = data.involved_companies.filter((company) => company.publisher)
		const developers = data.involved_companies.filter((company) => company.developer)
		if (publishers.length) {
			result.publisher = publishers.map((company) => company.company.name).join(', ')
		}

		if (developers.length) {
			result.developer = developers.map((company) => company.company.name).join(', ')
		}
	}

	return result
}

export { getIgdbClient, getIgdb }
