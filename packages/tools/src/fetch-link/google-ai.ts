import { Content, GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'
import { readFile } from 'fs/promises'

const MODEL_NAME = 'gemini-1.5-flash'

const generationConfig: GenerationConfig = {
	temperature: 1,
	topK: 64,
	topP: 0.95,
	maxOutputTokens: 8192,
	responseMimeType: 'application/json',
}

function getClient(apiKey: string) {
	return new GoogleGenerativeAI(apiKey)
}

async function generateMetadataForHtml(apiKey: string, type: 'article' | 'website', html: string) {
	const genAI = getClient(apiKey)
	const model = genAI.getGenerativeModel({ model: MODEL_NAME })
	const htmlData = await readFile(html, 'utf-8')
	const content: Content = {
		role: 'user',
		parts: [
			{
				text: `generate a json object with the following fields, 'summary', 'image', 'tags' and 'word_count', 'date_published', 'author', 'title'. please extract those fields from the attached html file. the 'tags' field should be a list of comma separated tags that refer to a wide variety of topics like the ${type}'s theme, genre, subject, people, places that will be used to link this html file to other similar ones that have an overlapping tag. the 'image' field should be a URL to the main image of the html article. the 'summary' field should be at minimum one and maximum two paragraph summary of the main content of the html file. the 'date_published' field should be of the form YYYY/MM/DD that the article was published. the 'word_count' field should be an estimate of the number of words in the article itself. please note, not all fields will exist or make sense, so if the field can not be extracted, please leave it out of the json output.`,
			},
			{
				inlineData: {
					data: Buffer.from(htmlData).toString('base64'),
					mimeType: 'text/html',
				},
			},
		],
	}

	const result = await model.generateContent({
		contents: [content],
		generationConfig,
	})

	const textResult = result.response.text()

	return JSON.parse(textResult) as {
		summary: string
		image: string
		tags: string
		word_count: number
		date_published: string
		author: string
		title: string
	}
}

async function generateMetadataForUrl(apiKey: string, type: 'article' | 'website', url: string) {
	const genAI = getClient(apiKey)
	const model = genAI.getGenerativeModel({ model: MODEL_NAME })
	const prompt = `generate a json output with two fields: 'tags' and 'summary' to be extracted for the ${type} found on: ${url}. the 'tags' field should be a list of comma separated tags, where a tag refers to a wide variety of extracted topics, theme, genre, subject, people, places and more. the 'summary' field should be a one to two paragraph summary of the main content.`

	const parts = [
		{
			text: "input: generate a json output with two fields: 'tags' and 'summary' to be extracted for the article found on: https://blog.archive.org/2024/04/08/aruba-launches-digital-heritage-portal-preserving-its-history-and-culture-for-global-access/. the 'tags' field should be a list of comma separated tags, where a tag refers to a wide variety of extracted topics, theme, genre, subject, people, places and more. the 'summary' field should be a one to two paragraph summary of the main content.",
		},
		{
			text: 'output: { "tags": "aruba, caribbean, cultural heritage, digital archive, history, internet archive, libraries, national archives, online access, research, scholars, students, university of california irvine, utrecht university, venezuela, collaboration, digitization, funding, netherlands, oil refinery, aruba\'s digital heritage portal, freely accessible online collection of aruban historical materials, digitized newspapers, government reports, cultural items, researchers, study aruba\'s history", "summary": "Aruba launched a digital heritage portal to make its rich history and culture more accessible to people around the world. The portal provides free access to digitized historical materials, including documents, newspapers, and cultural artifacts. The project was made possible by a collaboration between Aruba’s institutions and the Internet Archive. Researchers are already using the portal for their work."}',
		},
		{
			text: `input: ${prompt}`,
		},
	]

	const result = await model.generateContent({
		contents: [{ role: 'user', parts }],
		generationConfig,
	})

	const textResult = result.response.text()

	return JSON.parse(textResult) as { tags: string; summary: string }
}

export { generateMetadataForHtml, generateMetadataForUrl }
