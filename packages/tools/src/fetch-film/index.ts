#! /usr/bin/env node

import { generateMetadataFromPrompt } from './google-ai.js'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import yaml from 'yaml'

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const results: Record<string, string | number> = {}

		if (command.tmdbApiKey) {
			const filmId = command.id
			const filmType = command.type ?? 'movie'
			const url = `https://api.themoviedb.org/3/${filmType}/${filmId}?api_key=${command.tmdbApiKey}&append_to_response=keywords,credits`

			try {
				const response = await fetch(url)
				if (!response.ok) {
					throw new Error(`Network response was not ok (${response.status})`)
				}
				const data = await response.json()

				const genres = data.genres || []
				const keywords = data.keywords.keywords || []
				const credits = data.credits || { cast: [], crew: [] }

				results['title'] = data.name
				results['summary'] = data.overview
				results['date_released'] = data.release_date
				results['runtime'] = data.runtime
				results['subtitle'] = data.tagline
				results['language'] = data.original_language
				results['url'] = `https://www.themoviedb.org/${filmType}/${filmId}`
				results['homepage'] = data.homepage
				results['keywords'] = [
					...genres.map((genre: { name: string }) => genre.name),
					...keywords.map((keyword: { name: string }) => keyword.name),
				].join(', ')
				results['people'] = [
					...credits.cast.map((person: { name: string }) => person.name),
					...credits.crew.map((person: { name: string }) => person.name),
				].join(', ')
				results['backdrop'] = `https://image.tmdb.org/t/p/original${data.backdrop_path}`
				results['poster'] = `https://image.tmdb.org/t/p/original${data.poster_path}`
				results['type'] = filmType

				Object.entries(results).forEach(([key, value]) => {
					if (value === null || value === undefined || value === '') {
						delete results[key]
					}
				})
			} catch (error) {
				console.error('Error fetching movie details:', error)
				throw error
			}
		}

		if (command.googleApiKey && command.prompt) {
			const aiResults = await generateMetadataFromPrompt(command.googleApiKey, command.prompt)

			Object.entries(aiResults).forEach(([key, value]) => {
				results[key] = value
			})
		}

		switch (command.output) {
			case 'json':
				console.log(JSON.stringify(results, null, 2))
				break
			default:
				console.log(yaml.stringify(results))
				break
		}
	} catch (err) {
		console.error(err)
	}
}

run()
