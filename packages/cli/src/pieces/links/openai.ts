import { Configuration, OpenAIApi } from 'openai'
import { PieceMarkdown } from 'src/lib/pieces/markdown.js'
import { LinkFrontmatter } from './schema.js'

const OPENAI_SYSTEM_TAGS_PROMPT =
	'You are curating a website that hosts thousands of bookmark links. When your website vistitors finds a bookmark they are interested in, you want them to be able to find other bookmarks that are similar. You use tags as a way to categorize the bookmark, to allow your visitors find other tangentially related bookmarks. You make use a variety of types of tags related to themes, categories, people, places, subjects and more. You will be given a url for each bookmark to start with. You will generate a list of tags for each link. You will provide a list of all tags as a comma separated list surrounded by triple quotes.'

const OPENAI_EXAMPLE_USER_TAGS_PROMPT =
	'Please generate between 30 and 100 tags for the bookmark https://empiricalzeal.com/2012/06/05/the-crayola-fication-of-the-world-how-we-gave-colors-names-and-it-messed-with-our-brains-part-i'

const OPENAI_EXAMPLE_ASSISTANT_TAGS_ANSWER =
	'"""color perception, color psychology, language and colors, synesthesia, cultural influence, linguistic evolution, color naming, color categorization, color symbolism, sensory perception, color symbolism, color theory, color vision, color experience, cognitive psychology, linguistics, cultural anthropology, cultural significance, naming conventions, color associations, color representation, visual perception, neurology, human perception, color semantics, color preferences, cultural diversity, cultural identity, cultural heritage, cultural norms, cultural expressions, human cognition, cultural psychology, linguistic relativity, communication, visual arts, design psychology, cross-cultural study, social impact of color, chromatics, cultural evolution"""'

const OPENAI_USER_TAGS_PROMPT_STRUCTURE = 'Please generate between 30 and 100 tags for the link %s'

const OPENAI_SYSTEM_SUMMARY_PROMPT =
	'You are curating a website that hosts thousands of bookmark links. When your website vistitors finds a bookmark they are interested in, you want to provide an accurate one or two paragraph summary of the bookmarks content so your visitors can better decide if they do or do not want to click through the link to visit the website. Many, but not all of the links are to essays, blogs or articles. Some of the sites are homepages. If the link leads to a blog, article or essay, a good summary will summarize the main points of the written content. If the link is a homepage, a good summary will describe the purpose of the website. You will provide the summary surrounded by triple quotes.'

const OPENAI_EXAMPLE_USER_SUMMARY_PROMPT =
	'Please generate a summary for the url https://empiricalzeal.com/2012/06/05/the-crayola-fication-of-the-world-how-we-gave-colors-names-and-it-messed-with-our-brains-part-i'

const OPENAI_EXAMPLE_ASSISTANT_SUMMARY_ANSWER =
	'"""This article explores how the way we name colors affects the way we perceive them. It discusses the impact of a 120-crayon box introduced by Crayola in 1998, which expanded the range of colors people were exposed to. The article suggests that by providing names for specific shades of colors, Crayola influenced how people categorized and perceived color. It also explores how different languages categorize colors differently, with some languages having a more elaborate color vocabulary than others. The author concludes that the naming of colors has a significant influence on how we perceive and interpret the world around us."""'

const OPENAI_USER_SUMMARY_PROMPT_STRUCTURE = 'Please generate a summary for the url %s'

const OPENAI_DELIMETER_MATCH = /"""([\w\W]*?)"""/ms

const OPENAI_SYSTEM_CLASSIFY_PROMPT =
	'You are curating a website that hosts thousands of bookmark links. When your website vistitors finds a bookmark they are interested in, you want them to quickly see if the bookmark is an article or not and if the bookmark leads to a website that has a paywall. You will be given a url for each bookmark to start with. You will first record a 1 if the bookmark is an article or a 0 if it is not. You will second record a 1 if the bookmark has a paywall and a 0 if not. You will provide your final answer as a comma separated list of integers surrounded by triple quotes.'

const OPENAI_EXAMPLE_USER_CLASSIFY_PROMPT =
	'Please generate a classification of articles and paywalls for the bookmark https://empiricalzeal.com/2012/06/05/the-crayola-fication-of-the-world-how-we-gave-colors-names-and-it-messed-with-our-brains-part-i'

const OPENAI_EXAMPLE_ASSISTANT_CLASSIFY_ANSWER = '"""1,0"""'

const OPENAI_USER_CLASSIFY_PROMPT_STRUCTURE = 'Please generate a classification for the link %s'

function getClient(apiKey: string): OpenAIApi {
	const configuration = new Configuration({ apiKey })
	return new OpenAIApi(configuration)
}

function getTagsPrompt(markdown: PieceMarkdown<LinkFrontmatter>): string {
	const url = markdown.frontmatter.url

	return OPENAI_USER_TAGS_PROMPT_STRUCTURE.replace('%s', url)
}

function getSummaryPrompt(markdown: PieceMarkdown<LinkFrontmatter>): string {
	const url = markdown.frontmatter.url
	return OPENAI_USER_SUMMARY_PROMPT_STRUCTURE.replace('%s', url)
}

function getClassificationPrompt(markdown: PieceMarkdown<LinkFrontmatter>): string {
	const url = markdown.frontmatter.url
	return OPENAI_USER_CLASSIFY_PROMPT_STRUCTURE.replace('%s', url)
}

async function generateTags(
	apiKey: string,
	markdown: PieceMarkdown<LinkFrontmatter>
): Promise<string[]> {
	const openai = getClient(apiKey)

	const response = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages: [
			{ role: 'system', content: OPENAI_SYSTEM_TAGS_PROMPT },
			{ role: 'user', content: OPENAI_EXAMPLE_USER_TAGS_PROMPT },
			{ role: 'assistant', content: OPENAI_EXAMPLE_ASSISTANT_TAGS_ANSWER },
			{ role: 'user', content: getTagsPrompt(markdown) },
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

async function generateSummary(
	apiKey: string,
	markdown: PieceMarkdown<LinkFrontmatter>
): Promise<string> {
	const openai = getClient(apiKey)

	const response = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages: [
			{ role: 'system', content: OPENAI_SYSTEM_SUMMARY_PROMPT },
			{ role: 'user', content: OPENAI_EXAMPLE_USER_SUMMARY_PROMPT },
			{ role: 'assistant', content: OPENAI_EXAMPLE_ASSISTANT_SUMMARY_ANSWER },
			{ role: 'user', content: getSummaryPrompt(markdown) },
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

async function generateClassification(
	apiKey: string,
	markdown: PieceMarkdown<LinkFrontmatter>
): Promise<{ is_article: boolean; is_paywall: boolean }> {
	const openai = getClient(apiKey)

	const response = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages: [
			{ role: 'system', content: OPENAI_SYSTEM_CLASSIFY_PROMPT },
			{ role: 'user', content: OPENAI_EXAMPLE_USER_CLASSIFY_PROMPT },
			{ role: 'assistant', content: OPENAI_EXAMPLE_ASSISTANT_CLASSIFY_ANSWER },
			{ role: 'user', content: getClassificationPrompt(markdown) },
		],
	})

	if (response.data.choices[0].finish_reason === 'stop') {
		const answer = response.data.choices[0].message?.content
		const classification = answer?.match(OPENAI_DELIMETER_MATCH)?.[1]
		const [article, paywall] = classification?.split(',') ?? []

		if (classification && classification.length) {
			return {
				is_article: article === '1',
				is_paywall: paywall === '1',
			}
		} else {
			throw new Error('OpenAI did not generate a description')
		}
	}

	throw new Error('OpenAI did not answer the description prompt')
}

export { generateTags, generateSummary, generateClassification }
