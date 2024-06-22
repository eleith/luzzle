import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-1.5-flash'

function getClient(apiKey: string) {
	return new GoogleGenerativeAI(apiKey)
}

async function generateTags(apiKey: string, type: 'article' | 'website', url: string) {
	const genAI = getClient(apiKey)
	const model = genAI.getGenerativeModel({ model: MODEL_NAME })

	const generationConfig = {
		temperature: 1,
		topK: 64,
		topP: 0.95,
		maxOutputTokens: 8192,
	}

	const prompt = `generate a list of comma separated tags for the ${type} on: ${url}`

	const parts = [
		{
			text: "input: generate a list of comma separated tags for the article on: https://blog.archive.org/2024/04/08/aruba-launches-digital-heritage-portal-preserving-its-history-and-culture-for-global-access/. these tags should refer to a wide variety of topics like the article's theme, genre, subject, people, places and more.",
		},
		{
			text: "output: aruba, caribbean, cultural heritage, digital archive, history, internet archive, libraries, national archives, online access, research, scholars, students, university of california irvine, utrecht university, venezuela, collaboration, digitization, funding, netherlands, oil refinery, aruba's digital heritage portal, freely accessible online collection of aruban historical materials, digitized newspapers, government reports, cultural items, researchers, study aruba's history",
		},
		{
			text: `input: ${prompt}. these tags should refer to a wide variety of topics like the ${type}'s theme, genre, subject, people, places and more.`,
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

async function generateDescription(apiKey: string, type: string, url: string) {
	const genAI = getClient(apiKey)
	const model = genAI.getGenerativeModel({ model: MODEL_NAME })

	const generationConfig = {
		temperature: 1,
		topK: 64,
		topP: 0.95,
		maxOutputTokens: 8192,
	}

	const prompt = `write a one paragraph summary for the ${type} on: ${url}`

	const parts = [
		{
			text: 'input: write a one paragraph summary for the article on: https://blog.archive.org/2024/04/08/aruba-launches-digital-heritage-portal-preserving-its-history-and-culture-for-global-access/',
		},
		{
			text: 'output: Aruba launched a digital heritage portal to make its rich history and culture more accessible to people around the world. The portal provides free access to digitized historical materials, including documents, newspapers, and cultural artifacts. The project was made possible by a collaboration between Aruba’s institutions and the Internet Archive. Researchers are already using the portal for their work.',
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
