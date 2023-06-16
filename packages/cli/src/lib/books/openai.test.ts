import * as openAI from 'openai'
import * as openAILib from './openai.js'
import { makeBookMd } from './book.fixtures.js'
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

describe('lib/books/openai', () => {
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
    const bookMd = makeBookMd()
    const tags = ['tag1', 'tag2', 'tag2']
    const openAIMocks = mockOpenAI()

    openAIMocks.createChatCompletionMock.mockResolvedValue(
      makeChatResponse(`"""${tags.join(',')}"""`)
    )
    const foundTags = await openAILib.generateTags(apiKey, bookMd)

    expect(foundTags).toEqual([...new Set(tags)])
  })

  test('generateTags does not finish', async () => {
    const apiKey = 'test-api-key'
    const bookMd = makeBookMd()
    const openAIMocks = mockOpenAI()

    openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('', 'incomplete'))

    const response = openAILib.generateTags(apiKey, bookMd)
    expect(response).rejects.toThrowError()
  })

  test('generateTags does not answer with tags', async () => {
    const apiKey = 'test-api-key'
    const bookMd = makeBookMd()
    const openAIMocks = mockOpenAI()

    openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('no tags'))

    const response = openAILib.generateTags(apiKey, bookMd)
    expect(response).rejects.toThrowError()
  })

  test('generateDescription', async () => {
    const apiKey = 'test-api-key'
    const bookMd = makeBookMd()
    const description = 'a tiny description'
    const openAIMocks = mockOpenAI()

    openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse(`"""${description}"""`))
    const foundDescription = await openAILib.generateDescription(apiKey, bookMd)

    expect(foundDescription).toEqual(description)
  })

  test('generateDescription does not finish', async () => {
    const apiKey = 'test-api-key'
    const bookMd = makeBookMd()
    const openAIMocks = mockOpenAI()

    openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('', 'incomplete'))
    const response = openAILib.generateDescription(apiKey, bookMd)

    expect(response).rejects.toThrowError()
  })

  test('generateDescription does not have a description', async () => {
    const apiKey = 'test-api-key'
    const bookMd = makeBookMd()
    const openAIMocks = mockOpenAI()

    openAIMocks.createChatCompletionMock.mockResolvedValue(makeChatResponse('fake description'))
    const response = openAILib.generateDescription(apiKey, bookMd)

    expect(response).rejects.toThrowError()
  })
})
