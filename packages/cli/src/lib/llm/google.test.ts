import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { generatePieceFrontmatter } from './google.js'
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager, UploadFileResponse } from '@google/generative-ai/server'
import { makeSchema } from '../pieces/piece.fixtures.js'

vi.mock('@luzzle/core')
vi.mock('@google/generative-ai', () => {
	const Gemini = vi.fn()
	Gemini.prototype.getGenerativeModel = vi.fn()
	return { GoogleGenerativeAI: Gemini }
})
vi.mock('@google/generative-ai/server', () => {
	const FileManager = vi.fn()
	FileManager.prototype.uploadFile = vi.fn()
	return { GoogleAIFileManager: FileManager }
})

const mocks = {
	getGenerativeModel: vi.mocked(GoogleGenerativeAI.prototype.getGenerativeModel),
	uploadFile: vi.mocked(GoogleAIFileManager.prototype.uploadFile),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/llm/google.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('generatePieceFrontmatter', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)

		spies.generateContent = vi.fn().mockResolvedValue({ response: { text: () => responseText } })
		mocks.getGenerativeModel.mockReturnValue({
			generateContent: spies.generateContent,
		} as unknown as GenerativeModel)

		const generatedFrontmatter = await generatePieceFrontmatter(apiKey, schema, prompt)

		expect(mocks.getGenerativeModel).toHaveBeenCalledTimes(1)
		expect(spies.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([{ role: 'user', parts: [{ text: prompt }] }]),
			generationConfig: expect.any(Object),
		})
		expect(generatedFrontmatter).toEqual(frontmatter)
	})

	test('generatePieceFrontmatter with a file', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const file = '/path/to/file.pdf'
		const uri = 'gs://another/path/to/file.pdf'
		const mimeType = 'application/pdf'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)

		spies.generateContent = vi.fn().mockResolvedValue({ response: { text: () => responseText } })
		mocks.getGenerativeModel.mockReturnValue({
			generateContent: spies.generateContent,
		} as unknown as GenerativeModel)
		mocks.uploadFile.mockResolvedValue({ file: { uri, mimeType } } as UploadFileResponse)

		const generatedFrontmatter = await generatePieceFrontmatter(apiKey, schema, prompt, file)

		expect(mocks.getGenerativeModel).toHaveBeenCalledTimes(1)
		expect(mocks.uploadFile).toHaveBeenCalledWith(file, { mimeType, displayName: 'file.pdf' })
		expect(spies.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([
				{ role: 'user', parts: [{ fileData: { fileUri: uri, mimeType } }, { text: prompt }] },
			]),
			generationConfig: expect.any(Object),
		})
		expect(generatedFrontmatter).toEqual(frontmatter)
	})

	test('generatePieceFrontmatter fails with unsupported file', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const file = '/path/to/file.zip'

		mocks.getGenerativeModel.mockReturnValue({
			generateContent: spies.generateContent,
		} as unknown as GenerativeModel)

		const generate = generatePieceFrontmatter(apiKey, schema, prompt, file)

		expect(generate).rejects.toThrow()
	})
})
