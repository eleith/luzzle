import { Configuration, OpenAIApi } from 'openai'
import { BookMarkdown } from './schema.js'

const OPENAI_SYSTEM_TAGS_PROMPT =
	'You are a knowledgeable and well read librarian that is engaged on social media. You post one book a day on your social media account. On each post, you come up with a variety of tags that users can select to explore other associated books in the library. A tag is usually one, two, three or four words long. You make use a variety of types of tags related to genres, themes, settings, characters, emotions and even emojis. Your goal is to help people find other books related to those tags. You will be given a book title, description, and other book identifiers in order to find the book and read it. You will generate a list of tags for a given book. You will provide a list of all tags as a comma separated list surrounded by triple quotes.'

const OPENAI_EXAMPLE_USER_TAGS_PROMPT =
	'Please generate between 20 and 100 tags for the book "Snowcrash" by Neal Stephenson, ISBN: 9780553380958, description: Hiro lives in a Los Angeles where franchises line the freeway as far as the eye can see. The only relief from the sea of logos is within the autonomous city-states, where law-abiding citizens don’t dare leave their mansions. Hiro delivers pizza to the mansions for a living, defending his pies from marauders when necessary with a matched set of samurai swords. His home is a shared 20 X 30 U-Stor-It. He spends most of his time goggled in to the Metaverse, where his avatar is legendary. But in the club known as The Black Sun, his fellow hackers are being felled by a weird new drug called Snow Crash that reduces them to nothing more than a jittering cloud of bad digital karma (and IRL, a vegetative state). Investigating the Infocalypse leads Hiro all the way back to the beginning of language itself, with roots in an ancient Sumerian priesthood. He’ll be joined by Y.T., a fearless teenaged skateboard courier. Together, they must race to stop a shadowy virtual villain hell-bent on world domination.'

const OPENAI_EXAMPLE_ASSISTANT_TAGS_ANSWER =
	'"""Hiro, Y.T., Science fiction, Novel, Cyberpunk, Humor, Fiction, Science Fiction, Action & Adventure, Computer viruses, Cyberspace, Hackers, Virtual reality, Dystopia, Fantasy, Metaverse, Raven, Artificial intelligence, Thriller, Los Angeles, Anarcho-Capitalism, Avatars, Sumerian Mythology, Oregon, Hyperinflation"""'

const OPENAI_USER_TAGS_PROMPT_STRUCTURE = 'Please generate between 20 and 100 tags for the book %s'

const OPENAI_SYSTEM_DESC_PROMPT =
	'You are a knowledgable and well read librarian that is engaged on social media. You post one book a day on your social media account. On each post, you come up with a book description that engages readers who are looking for a book recommendation. A good book description is between 1 and 2 short paragraphs and alludes to the genre, setting, character, themes and possibly contains a hook. Your goal is to help people determine if they should read the book. You will be given a book title, a common description, and other book identifiers in order to find the book and read it. You will generate a one or two paragraph description for a given book. You will provide the description surrounded by triple quotes.'

const OPENAI_EXAMPLE_USER_DESC_PROMPT =
	'Please generate a book description for the book "Snowcrash" by Neal Stephenson, ISBN: 9780553380958, description: Within the Metaverse, Hiro is offered a datafile named Snow Crash by a man named Raven who hints that it is a form of narcotic. Hiro\'s friend and fellow hacker Da5id views a bitmap image contained in the file which causes his computer to crash and Da5id to suffer brain damage in the real world.'

const OPENAI_EXAMPLE_ASSISTANT_DESC_ANSWER =
	'"""Hiro lives in a Los Angeles where franchises line the freeway as far as the eye can see. The only relief from the sea of logos is within the autonomous city-states, where law-abiding citizens don’t dare leave their mansions. Hiro delivers pizza to the mansions for a living, defending his pies from marauders when necessary with a matched set of samurai swords. His home is a shared 20 X 30 U-Stor-It. He spends most of his time goggled in to the Metaverse, where his avatar is legendary. But in the club known as The Black Sun, his fellow hackers are being felled by a weird new drug called Snow Crash that reduces them to nothing more than a jittering cloud of bad digital karma (and IRL, a vegetative state). Investigating the Infocalypse leads Hiro all the way back to the beginning of language itself, with roots in an ancient Sumerian priesthood. He’ll be joined by Y.T., a fearless teenaged skateboard courier. Together, they must race to stop a shadowy virtual villain hell-bent on world domination."""'

const OPENAI_USER_DESC_PROMPT_STRUCTURE = 'Please generate a book description for the book %s'

const OPENAI_DELIMETER_MATCH = /"""([\w\W]*?)"""/ms

function getClient(apiKey: string): OpenAIApi {
	const configuration = new Configuration({ apiKey })
	return new OpenAIApi(configuration)
}

/* c8 ignore next 10 */
function getTagsPrompt(bookMd: BookMarkdown): string {
	const { title, isbn, description, author, subtitle, coauthors } = bookMd.frontmatter
	const fullTitle = subtitle ? `"${title}: ${subtitle}"` : `"${title}"`
	const fullAuthor = coauthors ? `${author} and ${coauthors}` : author
	const fullIsbn = isbn ? ` , ISBN: ${isbn}` : ''
	const fullDescription = description ? ` description: "${description}"` : ''
	const statement = `${fullTitle} by ${fullAuthor}${fullIsbn}${fullDescription}`

	return OPENAI_USER_TAGS_PROMPT_STRUCTURE.replace('%s', statement)
}

/* c8 ignore next 10 */
function getDescPrompt(bookMd: BookMarkdown): string {
	const { title, isbn, description, author, subtitle, coauthors } = bookMd.frontmatter
	const fullTitle = subtitle ? `"${title}: ${subtitle}"` : `"${title}"`
	const fullAuthor = coauthors ? `${author} and ${coauthors}` : author
	const fullIsbn = isbn ? ` , ISBN: ${isbn}` : ''
	const fullDescription = description ? ` description: "${description}"` : ''
	const statement = `${fullTitle} by ${fullAuthor}${fullIsbn}${fullDescription}`

	return OPENAI_USER_DESC_PROMPT_STRUCTURE.replace('%s', statement)
}

async function generateTags(apiKey: string, bookMd: BookMarkdown): Promise<string[]> {
	const openai = getClient(apiKey)

	const response = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages: [
			{ role: 'system', content: OPENAI_SYSTEM_TAGS_PROMPT },
			{ role: 'user', content: OPENAI_EXAMPLE_USER_TAGS_PROMPT },
			{ role: 'assistant', content: OPENAI_EXAMPLE_ASSISTANT_TAGS_ANSWER },
			{ role: 'user', content: getTagsPrompt(bookMd) },
		],
	})

	if (response.data.choices[0].finish_reason === 'stop') {
		const answer = response.data.choices[0].message?.content
		const tagList = answer?.match(OPENAI_DELIMETER_MATCH)?.[1]
		const tags = tagList?.split(',').map((tag) => tag.trim().replace('#', '').toLowerCase())

		if (tags && tags.length > 0) {
			return [...new Set(tags)]
		} else {
			throw new Error('OpenAI did not generate any tags')
		}
	}

	throw new Error('OpenAI did not answer the tag prompt')
}

async function generateDescription(apiKey: string, bookMd: BookMarkdown): Promise<string> {
	const openai = getClient(apiKey)

	const response = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages: [
			{ role: 'system', content: OPENAI_SYSTEM_DESC_PROMPT },
			{ role: 'user', content: OPENAI_EXAMPLE_USER_DESC_PROMPT },
			{ role: 'assistant', content: OPENAI_EXAMPLE_ASSISTANT_DESC_ANSWER },
			{ role: 'user', content: getDescPrompt(bookMd) },
		],
	})

	if (response.data.choices[0].finish_reason === 'stop') {
		const answer = response.data.choices[0].message?.content
		const description = answer?.match(OPENAI_DELIMETER_MATCH)?.[1]

		if (description && description.length) {
			return description
		} else {
			throw new Error('OpenAI did not generate a description')
		}
	}

	throw new Error('OpenAI did not answer the description prompt')
}

export { generateTags, generateDescription }
