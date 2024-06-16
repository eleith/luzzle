import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-1.5-flash'

function getClient(apiKey: string) {
	return new GoogleGenerativeAI(apiKey)
}

async function generateTags(apiKey: string, title: string, url?: string) {
	const genAI = getClient(apiKey)
	const model = genAI.getGenerativeModel({ model: MODEL_NAME })

	const generationConfig = {
		temperature: 1,
		topK: 64,
		topP: 0.95,
		maxOutputTokens: 8192,
	}

	const prompt = url
		? `generate a list of comma separated tags for the video game "${title}" that is described on: ${url}`
		: `generate a list of comma separated tags for the video game "${title}"`

	const parts = [
		{
			text: 'input: generate a list of comma separated tags for the video game "the legend of zelda" on the NES platform. these tags should refer to a wide variety of topics like the games theme, genre, setting, characters, gameplay mechanics, and more.',
		},
		{
			text: "output: action-adventure, fantasy, open-world, puzzle, exploration, Nintendo, classic, iconic, Zelda, Link, Hyrule, Ganon, Triforce, Master Sword, dungeons, magic, princess rescue, hero's journey, high fantasy, medieval, sword and sorcery, timeless, family-friendly",
		},
		{
			text: `input: ${prompt}. these tags should refer to a wide variety of topics like the games theme, genre, setting, characters, gameplay mechanics, and more.`,
		},
	]

	const result = await model.generateContent({
		contents: [{ role: 'user', parts }],
		generationConfig,
	})

	const tagString = result.response.text()
	const tags = tagString.split(',').map((tag) => tag.trim())

	return tags
}

async function generateDescription(apiKey: string, title: string, url?: string) {
	const genAI = getClient(apiKey)
	const model = genAI.getGenerativeModel({ model: MODEL_NAME })

	const generationConfig = {
		temperature: 1,
		topK: 64,
		topP: 0.95,
		maxOutputTokens: 8192,
	}

	const prompt = url
		? `write a one paragraph summary for the video game "${title}" that is described on ${url}`
		: `write a one paragraph summary for the video game "${title}"`

	const parts = [
		{
			text: 'input: write a one paragraph summary for the video game "the legend of zelda" on the NES platform',
		},
		{
			text: "output: The Legend of Zelda is the first title in the Zelda series, it has marked the history of video games particularly for it's game mechanics and universe. The player controls Link and must make his way through the forests, graveyards, plains and deserts of the Otherworld to find the secret entrances to the eight dungeons and try to restore the broken Triforce. Among the game's mechanics, it was the first time we saw a continuous world that could be freely explored, power-ups that permanently enhanced the main character's abilities and a battery save feature that allowed players to keep their progress instead of having to start over. The gameplay balanced action sequences with discovery, secrets and exploration.",
		},
		{
			text: `input: ${prompt}`,
		},
	]

	const result = await model.generateContent({
		contents: [{ role: 'user', parts }],
		generationConfig,
	})

	return result.response.text()
}

export { generateTags, generateDescription }
