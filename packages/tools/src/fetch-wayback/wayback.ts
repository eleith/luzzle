import got from 'got'

type WaybackAvailability = {
	url: string
	archived_snapshots: {
		closest?: {
			available: boolean
			status: string
			timestamp: string
			url: string
		}
	}
}

const WAYBACK_API = 'https://archive.org/wayback'

async function availability(url: string): Promise<WaybackAvailability | null> {
	try {
		const response = await got.get<WaybackAvailability>(`${WAYBACK_API}/available`, {
			searchParams: {
				url,
			},
			responseType: 'json',
		})

		if (response.statusCode === 200) {
			return response.body
		}
	} catch (e) {
		console.error('wayback availability api error: ', e)
	}

	return null
}

async function getClosestAvailable(url: string) {
	const waybackAvailability = await availability(url)

	if (waybackAvailability) {
		const closest = waybackAvailability.archived_snapshots.closest
		if (closest && closest.available) {
			return closest.url
		}
	}

	return null
}

export { availability, getClosestAvailable }
