import { Content, GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-1.5-flash'

interface GameMetadata {
	title: string
	publisher: string
	developer: string
	description: string
	keywords: string
	date_published: string
	play_time: number
	number_of_players: number
	played_on: string
}

function getClient(apiKey: string) {
	return new GoogleGenerativeAI(apiKey)
}

const generationConfig: GenerationConfig = {
	temperature: 1,
	topK: 64,
	topP: 0.95,
	maxOutputTokens: 8192,
	responseMimeType: 'application/json',
}

const gameSchema = {
	title: 'Video Game',
	description: 'A JSON schema for video game metadata',
	type: 'object',
	properties: {
		title: {
			type: 'string',
			description: 'The title of the video game',
		},
		publisher: {
			description: 'The company that published the video game',
			type: 'string',
		},
		developer: {
			description: 'The company that developed the video game',
			type: 'string',
		},
		description: {
			description: 'A one or two paragraph description of the video game',
			type: 'string',
		},
		keywords: {
			description:
				'A comma separated list of 5 to 20 keywords that reference a wide variety of topics related to this video game like theme, genre, setting, characters, gameplay mechanics, and other keywords that could be used to link to games with similar keywords',
			type: 'string',
		},
		date_published: {
			description: 'The date the video game was published in the format YYYY/MM/DD',
			type: 'string',
		},
		play_time: {
			description: 'The average time it takes to play the video game in hours',
			type: 'integer',
		},
		number_of_players: {
			description: 'The number of players that can play the video game simultaneously',
			type: 'integer',
		},
		played_on: {
			description: 'The platform the video game was played on',
			type: 'string',
			enum: [
				'xbox 360',
				'android',
				'nes',
				'snes',
				'n64',
				'gamecube',
				'wii',
				'switch',
				'gameboy',
				'gameboy advance sp',
				'ds',
				'steam',
				'pc',
				'playstation 5',
				'web',
				'stadia',
			],
		},
	},
	required: ['title', 'developer', 'description', 'keywords'],
}

const gameExample: GameMetadata = {
	title: 'The Legend of Zelda',
	publisher: 'Nintendo',
	developer: 'Nintendo',
	description:
		"The Legend of Zelda is a high-fantasy action-adventure video game series created by Japanese game designers Shigeru Miyamoto and Takashi Tezuka. It is primarily developed and published by Nintendo, although some portable installments and re-releases have been outsourced to Capcom, Vanpool, and Grezzo. The series' gameplay incorporates elements of action, adventure, and puzzle-solving games.",
	keywords:
		"action-adventure, fantasy, open-world, puzzle, exploration, Nintendo, classic, iconic, Zelda, Link, Hyrule, Ganon, Triforce, Master Sword, dungeons, magic, princess rescue, hero's journey, high fantasy, medieval, sword and sorcery, timeless, family-friendly",
	date_published: '1986/02/21',
	play_time: 50,
	number_of_players: 1,
	played_on: 'nes',
}

async function generateMetadataFromPrompt(apiKey: string, prompt: string) {
	const genAI = getClient(apiKey)

	const instruction = `you will generate metadata a single video game using the following JSON schema:
		${JSON.stringify(gameSchema, null, 2)}
	`

	const examplePrompt: Content = {
		role: 'user',
		parts: [
			{
				text: 'generate metadata for the video game: described on the page https://www.igdb.com/games/the-legend-of-zelda',
			},
		],
	}

	const examplePromptResponse: Content = {
		role: 'model',
		parts: [
			{
				text: JSON.stringify(gameExample, null, 2),
			},
		],
	}

	const userPrompt: Content = {
		role: 'user',
		parts: [
			{
				text: `generate metadata for the video game: ${prompt}`,
			},
		],
	}

	const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: instruction })
	const result = await model.generateContent({
		contents: [examplePrompt, examplePromptResponse, userPrompt],
		generationConfig,
	})

	const metadata = result.response.text()

	return JSON.parse(metadata) as GameMetadata
}

export { generateMetadataFromPrompt }
