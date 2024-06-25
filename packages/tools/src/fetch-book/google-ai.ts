import { Content, GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-1.5-flash'

interface BookMetadata {
	title: string
	author: string
	coauthors?: string
	isbn?: string
	url?: string
	subtitle?: string
	description?: string
	pages?: number
	year_first_published?: number
	cover?: string
	keywords?: string
	date_read?: string
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

const bookSchema = {
	title: 'Book',
	description: 'A JSON schema for book metadata',
	type: 'object',
	properties: {
		title: {
			description: 'The title of the book',
			type: 'string',
		},
		author: {
			description: 'The author of the book',
			type: 'string',
		},
		coauthors: {
			description: 'a command separated list of coauthors of the book',
			type: 'string',
		},
		url: {
			description: 'The URL of a webpage that provides more information about the book',
			type: 'string',
			pattern: '^(http|https)://',
		},
		isbn: {
			description: 'The ISBN of the book',
			type: 'string',
			pattern: '((?:[\\dX]{13})|(?:[\\d\\-X]{17})|(?:[\\dX]{10})|(?:[\\d\\-X]{13}))',
		},
		subtitle: {
			description: 'The subtitle of the book',
			type: 'string',
		},
		description: {
			description: 'A one or two paragraph description of the book',
			type: 'string',
		},
		pages: {
			description: 'The number of pages in the book',
			type: 'integer',
		},
		year_first_published: {
			description: 'The year the book was first published',
			type: 'integer',
		},
		cover: {
			description: 'The path to the cover image of the book',
			format: 'asset',
		},
		keywords: {
			description:
				'A comma separated list of 5 to 20 keywords that reference a wide variety of topics related to this book like theme, genre, setting, characters, and other keywords that could be used to link to books with similar keywords',
			type: 'string',
		},
	},
	required: ['title', 'author'],
	additionalProperties: true,
}

const bookExample: BookMetadata = {
	title: 'Snowcrash',
	subtitle: 'A Novel',
	author: 'Neal Stephenson',
	isbn: '9781596061576',
	pages: 480,
	year_first_published: 1992,
	url: 'https://openlibrary.org/books/OL27284029M',
	description:
		'Hiro lives in a Los Angeles where franchises line the freeway as far as the eye can see. The only relief from the sea of logos is within the autonomous city-states, where law-abiding citizens don’t dare leave their mansions. Hiro delivers pizza to the mansions for a living, defending his pies from marauders when necessary with a matched set of samurai swords. His home is a shared 20 X 30 U-Stor-It. He spends most of his time goggled in to the Metaverse, where his avatar is legendary. But in the club known as The Black Sun, his fellow hackers are being felled by a weird new drug called Snow Crash that reduces them to nothing more than a jittering cloud of bad digital karma (and IRL, a vegetative state). Investigating the Infocalypse leads Hiro all the way back to the beginning of language itself, with roots in an ancient Sumerian priesthood. He’ll be joined by Y.T., a fearless teenaged skateboard courier. Together, they must race to stop a shadowy virtual villain hell-bent on world domination.',
	keywords:
		'Hiro, Y.T., Science fiction, Novel, Cyberpunk, Humor, Fiction, Science Fiction, Action & Adventure, Computer viruses, Cyberspace, Hackers, Virtual reality, Dystopia, Fantasy, Metaverse, Raven, Artificial intelligence, Thriller, Los Angeles, Anarcho-Capitalism, Avatars, Sumerian Mythology, Oregon, Hyperinflation',
}

async function generateMetadataFromPrompt(apiKey: string, prompt: string) {
	const genAI = getClient(apiKey)

	const instruction = `you will generate metadata a single book using the following JSON schema:

		${JSON.stringify(bookSchema, null, 2)}

	attempt to generate as many field values as possible for the schema`

	const examplePrompt: Content = {
		role: 'user',
		parts: [
			{
				text: 'generate metadata for the book: Snow Crash by Neal Stephenson from https://openlibrary.org/books/OL27284029M',
			},
		],
	}

	const examplePromptResponse: Content = {
		role: 'model',
		parts: [
			{
				text: JSON.stringify(bookExample, null, 2),
			},
		],
	}

	const userPrompt: Content = {
		role: 'user',
		parts: [
			{
				text: `generate metadata for the book: ${prompt}`,
			},
		],
	}

	const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: instruction })
	const result = await model.generateContent({
		contents: [examplePrompt, examplePromptResponse, userPrompt],
		generationConfig,
	})

	const metadata = result.response.text()

	return JSON.parse(metadata) as BookMetadata
}

export { generateMetadataFromPrompt }
