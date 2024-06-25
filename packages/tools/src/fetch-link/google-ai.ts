import { Content, GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'
import { readFile } from 'fs/promises'
import path from 'path'

const MODEL_NAME = 'gemini-1.5-flash'

interface LinkMetadata {
	title: string
	url: string
	is_active: boolean
	is_paywall: boolean
	type: 'article' | 'bookmark'
	author?: string
	coauthors?: string
	subtitle?: string
	summary?: string
	keywords?: string
	representative_image?: string
	archive_url?: string
	archive_path?: string
	date_published?: string
	date_accessed?: string
	word_count?: number
}

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

const linkSchema = {
	title: 'Link',
	type: 'object',
	properties: {
		title: {
			description: 'The title of the website or article',
			type: 'string',
		},
		url: {
			description: 'The URL of the website or article',
			type: 'string',
			pattern: '^(http|https)://',
		},
		is_active: {
			description: 'Whether the link is active or not',
			type: 'boolean',
		},
		is_paywall: {
			description: 'Whether the link is behind a paywall or not',
			type: 'boolean',
		},
		type: {
			description: 'the type of link, either an article or a bookmark',
			type: 'string',
			enum: ['article', 'bookmark'],
		},
		author: {
			description: 'The author of the article',
			type: 'string',
		},
		subtitle: {
			description: 'The subtitle of the article',
			type: 'string',
		},
		coauthors: {
			description: 'a comma separated list of the coauthors of the article',
			type: 'string',
		},
		summary: {
			description: 'A summary of the article',
			type: 'string',
		},
		keywords: {
			description: 'A comma separated list of keywords',
			type: 'string',
		},
		representative_image: {
			description: 'The path to main image of the article',
			type: 'string',
			format: 'asset',
		},
		archive_url: {
			description: 'The URL of the internet archive of the article',
			type: 'string',
			pattern: '^(http|https)://',
		},
		archive_path: {
			description: 'The path of the offline archive of the article',
			type: 'string',
			format: 'asset',
		},
		date_published: {
			description: 'The date the article was published',
			type: 'string',
			format: 'date',
		},
		date_accessed: {
			description: 'The date the link was accessed',
			type: 'string',
			format: 'date',
		},
		word_count: {
			description: 'The number of words in the main article or file',
			type: 'integer',
		},
	},
	required: ['title', 'url', 'is_active', 'is_paywall', 'type'],
	additionalProperties: true,
}

const linkExample: LinkMetadata = {
	url: 'https://blog.archive.org/2024/04/08/aruba-launches-digital-heritage-portal-preserving-its-history-and-culture-for-global-access/',
	title:
		'Aruba Launches Digital Heritage Portal, Preserving Its History and Culture for Global Access',
	author: 'Caralee Adams',
	date_published: '2024/04/08',
	type: 'article',
	is_active: true,
	word_count: 750,
	is_paywall: false,
	keywords:
		"aruba, caribbean, cultural heritage, digital archive, history, internet archive, libraries, national archives, online access, research, scholars, students, university of california irvine, utrecht university, venezuela, collaboration, digitization, funding, netherlands, oil refinery, aruba's digital heritage portal, freely accessible online collection of aruban historical materials, digitized newspapers, government reports, cultural items, researchers, study aruba's history",
	summary:
		'Aruba launched a digital heritage portal to make its rich history and culture more accessible to people around the world. The portal provides free access to digitized historical materials, including documents, newspapers, and cultural artifacts. The project was made possible by a collaboration between Aruba’s institutions and the Internet Archive. Researchers are already using the portal for their work.',
}

async function generateMetadataFromPrompt(apiKey: string, prompt: string, file?: string) {
	const genAI = getClient(apiKey)

	const instruction = `you will generate metadata for a file or link using the following JSON schema:

		${JSON.stringify(linkSchema, null, 2)}
	
	attempt to generate as many field values as possible given the schema.`

	const examplePrompt: Content = {
		role: 'user',
		parts: [
			{
				text: 'generate metadata for the link: https://blog.archive.org/2024/04/08/aruba-launches-digital-heritage-portal-preserving-its-history-and-culture-for-global-access/',
			},
		],
	}

	const examplePromptResponse: Content = {
		role: 'model',
		parts: [
			{
				text: JSON.stringify(linkExample, null, 2),
			},
		],
	}

	const userPrompt: Content = {
		role: 'user',
		parts: [
			{
				text: `generate metadata for the link: ${prompt}`,
			},
		],
	}

	if (file) {
		const data = await readFile(file, 'utf-8')
		const extension = path.parse(file).ext

		userPrompt.parts = [
			{
				text: `generate metadata for the attached file that was extracted from ${prompt}`,
			},
			{
				inlineData: {
					data: Buffer.from(data).toString('base64'),
					mimeType: `text/${extension.slice(1)}`,
				},
			},
		]
	}

	const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: instruction })
	const result = await model.generateContent({
		contents: [examplePrompt, examplePromptResponse, userPrompt],
		generationConfig,
	})

	const metadata = result.response.text()

	return JSON.parse(metadata) as LinkMetadata
}

export { generateMetadataFromPrompt }
