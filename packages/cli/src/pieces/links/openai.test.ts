import * as openAI from 'openai'
import * as openAILib from './openai.js'
import { makeLinkMarkdown } from './link.fixtures.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'

vi.mock('openai')

const mockOpenAI = () => {
	const api = {
		createChatCompletionMock: vi.fn(),
	}

	const client = () => {
		return {
			createChatCompletion: api.createChatCompletionMock,
		} as unknown as openAI.OpenAIApi
	}

	vi.mocked(openAI, true).OpenAIApi.mockImplementationOnce(client)

	return api
}

const mocks = {
	test: vi.fn(),
}

function makeChatResponse(content: string, reason = 'stop') {
	return {
		data: {
			choices: [
				{
					finish_reason: reason,
					message: {
						role: 'assistant',
						content,
					},
				},
			],
		},
	}
}

const spies: SpyInstance[] = []

describe('pieces/links/openai.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		spies.forEach((spy) => {
			spy.mockRestore()
		})
	})

	test('generateTags', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const tags = ['tag1', 'tag2', 'tag2']
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(
			makeChatResponse(`"""${tags.join(',')}"""`)
		)
		const foundTags = await openAILib.generateTags(apiKey, linkMarkdown)

		expect(foundTags).toEqual([...new Set(tags)])
	})

	test('generateTags does not finish', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('', 'incomplete'))

		const response = openAILib.generateTags(apiKey, linkMarkdown)
		expect(response).rejects.toThrowError()
	})

	test('generateTags does not answer with tags', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('no tags'))

		const response = openAILib.generateTags(apiKey, linkMarkdown)
		expect(response).rejects.toThrowError()
	})

	test('generateDescription', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const description = 'a tiny description'
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse(`"""${description}"""`))
		const foundDescription = await openAILib.generateSummary(apiKey, linkMarkdown)

		expect(foundDescription).toEqual(description)
	})

	test('generateDescription does not finish', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('', 'incomplete'))
		const response = openAILib.generateSummary(apiKey, linkMarkdown)

		expect(response).rejects.toThrowError()
	})

	test('generateDescription does not have a description', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('fake description'))
		const response = openAILib.generateSummary(apiKey, linkMarkdown)

		expect(response).rejects.toThrowError()
	})

	test('generateClassification', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const classification = '1,1'
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(
			makeChatResponse(`"""${classification}"""`)
		)
		const foundDescription = await openAILib.generateClassification(apiKey, linkMarkdown)

		expect(foundDescription).toEqual({ is_article: true, is_paywall: true })
	})

	test('generateClassification does not finish', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('', 'incomplete'))
		const response = openAILib.generateClassification(apiKey, linkMarkdown)

		expect(response).rejects.toThrowError()
	})

	test('generateClassification does not have a description', async () => {
		const apiKey = 'test-api-key'
		const linkMarkdown = makeLinkMarkdown()
		const openAIMocks = mockOpenAI()

		openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('fake classification'))
		const response = openAILib.generateClassification(apiKey, linkMarkdown)

		expect(response).rejects.toThrowError()
	})
})
