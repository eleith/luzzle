import { describe, expect, vi, afterEach, test, MockInstance } from 'vitest'
import { pieceFrontMatterFromPrompt } from './google.js'
import {
	GoogleGenAI,
	Part,
	createPartFromUri,
	GenerateContentResponse,
	FileState,
} from '@google/genai'
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type'
import { readFile } from 'fs/promises'
import { JSONSchemaType } from 'ajv'
import { PieceFrontmatter } from '../pieces/index.js'

// Mock schema created locally to remove dependency on piece.fixtures.ts
const makeSchema = (
	name: string
): JSONSchemaType<PieceFrontmatter> => {
	return {
		type: 'object',
		title: name,
		properties: {
			title: { type: 'string', examples: ['title'] },
			keywords: { type: 'string', nullable: true },
		},
		required: ['title'],
		additionalProperties: false,
	} as unknown as JSONSchemaType<PieceFrontmatter>
}

vi.mock('@luzzle/core')
vi.mock('file-type')
vi.mock('fs/promises')
vi.mock('@google/genai', () => {
	const Gemini = vi.fn()

	Gemini.prototype.models = vi.fn()
	Gemini.prototype.files = vi.fn()
	Gemini.prototype.models.generateContent = vi.fn()
	Gemini.prototype.files.upload = vi.fn()
	Gemini.prototype.files.get = vi.fn()

	return {
		GoogleGenAI: Gemini,
		HarmCategory: {},
		HarmBlockThreshold: {},
		createPartFromUri: vi.fn(),
	}
})

const mocks = {
	generateContent: vi.mocked(GoogleGenAI.prototype.models.generateContent),
	uploadFile: vi.mocked(GoogleGenAI.prototype.files.upload),
	getFile: vi.mocked(GoogleGenAI.prototype.files.get),
	fileTypeFromFile: vi.mocked(fileTypeFromFile),
	fileTypeFromBuffer: vi.mocked(fileTypeFromBuffer),
	createPartFromUri: vi.mocked(createPartFromUri),
	readFile: vi.mocked(readFile),
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

	test('pieceFrontMatterFromPrompt', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)

		const generatedFrontmatter = await pieceFrontMatterFromPrompt(apiKey, schema, prompt)

		expect(mocks.generateContent).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([prompt]),
			config: expect.any(Object),
			model: expect.any(String),
		})
		expect(generatedFrontmatter).toEqual(frontmatter)
	})

	test('pieceFrontMatterFromPrompt strips empty fields', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const frontmatter = { field: 'value', field2: null, field3: undefined }
		const responseText = JSON.stringify(frontmatter)

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)

		const generatedFrontmatter = await pieceFrontMatterFromPrompt(apiKey, schema, prompt)

		expect(mocks.generateContent).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([prompt]),
			config: expect.any(Object),
			model: expect.any(String),
		})
		expect(generatedFrontmatter).toEqual({ field: 'value' })
	})

	test('pieceFrontMatterFromPrompt returns on empty result', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const responseText = undefined

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)

		const generatedFrontmatter = await pieceFrontMatterFromPrompt(apiKey, schema, prompt)

		expect(mocks.generateContent).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([prompt]),
			config: expect.any(Object),
			model: expect.any(String),
		})
		expect(generatedFrontmatter).toEqual({})
	})

	test('generatePieceFrontmatter with a binary file', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const file = '/path/to/file.pdf'
		const uri = 'gs://another/path/to/file.pdf'
		const name = 'file.pdf'
		const mimeType = 'application/pdf'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)
		const fileContent = 'fileContent' as Part

		vi.useFakeTimers()

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)
		mocks.uploadFile.mockResolvedValue({ name, uri, mimeType })
		mocks.getFile.mockResolvedValueOnce({ state: 'PROCESSING' as FileState })
		mocks.getFile.mockResolvedValueOnce({ uri, mimeType, state: 'ACTIVE' as FileState })
		mocks.fileTypeFromFile.mockResolvedValueOnce({ mime: mimeType, ext: 'pdf' })
		mocks.createPartFromUri.mockReturnValue(fileContent)

		vi.runAllTimersAsync()

		const generatedFrontmatter = await pieceFrontMatterFromPrompt(apiKey, schema, prompt, [file])

		expect(mocks.uploadFile).toHaveBeenCalledWith({ file, config: { mimeType } })
		expect(mocks.getFile).toHaveBeenCalledWith({ name })
		expect(mocks.createPartFromUri).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([prompt, fileContent]),
			config: expect.any(Object),
			model: expect.any(String),
		})
		expect(generatedFrontmatter).toEqual(frontmatter)

		vi.useRealTimers()
	})

	test('generatePieceFrontmatter with a text file', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const file = '/path/to/file.html'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)
		const fileContent = 'fileContent'

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)
		mocks.fileTypeFromFile.mockResolvedValueOnce(undefined)
		mocks.readFile.mockResolvedValueOnce(fileContent)

		const generatedFrontmatter = await pieceFrontMatterFromPrompt(apiKey, schema, prompt, [file])

		expect(mocks.generateContent).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([prompt, expect.stringContaining(fileContent)]),
			config: expect.any(Object),
			model: expect.any(String),
		})
		expect(generatedFrontmatter).toEqual(frontmatter)

		vi.useRealTimers()
	})

	test('generatePieceFrontmatter with a text Buffer', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)
		const buffer = Buffer.from('buffer data')

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)
		mocks.fileTypeFromBuffer.mockResolvedValueOnce(undefined)

		const generatedFrontmatter = await pieceFrontMatterFromPrompt(apiKey, schema, prompt, [buffer])

		expect(mocks.generateContent).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([prompt, expect.stringContaining(buffer.toString())]),
			config: expect.any(Object),
			model: expect.any(String),
		})

		expect(generatedFrontmatter).toEqual(frontmatter)
	})

	test('generatePieceFrontmatter with a binary Buffer', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const name = 'file.pdf'
		const uri = 'gs://another/path/to/file.pdf'
		const mimeType = 'application/pdf'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)
		const buffer = Buffer.from('buffer data')
		const blob = new Blob([buffer])
		const fileContent = 'fileContent' as Part

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)
		mocks.uploadFile.mockResolvedValue({ name, uri, mimeType })
		mocks.getFile.mockResolvedValue({ uri, mimeType, state: 'ACTIVE' as FileState })
		mocks.fileTypeFromBuffer.mockResolvedValueOnce({ mime: mimeType, ext: 'pdf' })
		mocks.createPartFromUri.mockReturnValue(fileContent)

		const generatedFrontmatter = await pieceFrontMatterFromPrompt(apiKey, schema, prompt, [buffer])

		expect(mocks.uploadFile).toHaveBeenCalledWith({ file: blob, config: { mimeType } })
		expect(mocks.getFile).toHaveBeenCalledWith({ name })
		expect(mocks.generateContent).toHaveBeenCalledTimes(1)
		expect(mocks.generateContent).toHaveBeenCalledWith({
			contents: expect.arrayContaining([prompt, fileContent]),
			config: expect.any(Object),
			model: expect.any(String),
		})

		expect(generatedFrontmatter).toEqual(frontmatter)
	})

	test('generatePieceFrontmatter binary file fails to process upload', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const file = '/path/to/file.pdf'
		const name = 'file.pdf'
		const mimeType = 'application/pdf'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)
		mocks.uploadFile.mockResolvedValue({ name, state: 'FAILED' as FileState })
		mocks.getFile.mockResolvedValue({})
		mocks.fileTypeFromFile.mockResolvedValueOnce({ mime: mimeType, ext: 'pdf' })

		const generating = pieceFrontMatterFromPrompt(apiKey, schema, prompt, [file])

		expect(generating).rejects.toThrowError()
	})

	test('generatePieceFrontmatter file fails to extract', async () => {
		const apiKey = 'apiKey'
		const schema = makeSchema('books')
		const prompt = 'prompt'
		const file = '/path/to/file.pdf'
		const name = 'file.pdf'
		const mimeType = 'application/pdf'
		const frontmatter = { field: 'value' }
		const responseText = JSON.stringify(frontmatter)

		mocks.generateContent.mockResolvedValueOnce({
			text: responseText,
		} as GenerateContentResponse)
		mocks.uploadFile.mockResolvedValue({ name, uri: undefined })
		mocks.getFile.mockResolvedValue({})
		mocks.fileTypeFromFile.mockResolvedValueOnce({ mime: mimeType, ext: 'pdf' })

		const generating = pieceFrontMatterFromPrompt(apiKey, schema, prompt, [file])

		expect(generating).rejects.toThrowError()
	})
})
