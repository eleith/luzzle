import { fileTypeFromBuffer } from 'file-type'
import { fileTypeFromFile } from 'file-type/node'
import type {
	ContentListUnion,
	SafetySetting} from '@google/genai';
import {
	createPartFromUri,
	GoogleGenAI,
	HarmCategory,
	HarmBlockThreshold
} from '@google/genai'
import { readFile } from 'fs/promises'
import path from 'path'
import type { JSONSchemaType } from 'ajv'
import compile from '../lib/ajv.js'
import { type PieceFrontmatter } from '../pieces/index.js'

const MODEL_NAME = 'gemini-2.5-flash'

const safetySettings: SafetySetting[] = [
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
]

function getClient(apiKey: string) {
	return new GoogleGenAI({ apiKey })
}

async function extractPartFromFile(file: string | Buffer, genAI: GoogleGenAI) {
	const isBuffer = Buffer.isBuffer(file)
	const fileType = isBuffer ? await fileTypeFromBuffer(file) : await fileTypeFromFile(file)
	const mimeType = fileType?.mime

	// assume it's non binary
	if (!mimeType) {
		const fileContent = isBuffer ? file.toString() : await readFile(file, 'utf-8')
		const fileName = isBuffer ? 'string buffer of downloaded file' : path.basename(file)
		const data = [
			`---[start] embedding ${fileName}---`,
			fileContent,
			`---[end] embedding of ${fileName}---`,
		]

		return data.join('\n')
	} else {
		const uploadedFile = await genAI.files.upload({
			file: isBuffer ? new Blob([file]) : file,
			config: {
				mimeType,
			},
		})

		// Wait for the file to be processed.
		let getFile = await genAI.files.get({ name: uploadedFile.name as string })

		while (getFile.state === 'PROCESSING') {
			getFile = await genAI.files.get({ name: uploadedFile.name as string })

			await new Promise((resolve) => {
				setTimeout(resolve, 5000)
			})
		}

		if (uploadedFile.state === 'FAILED') {
			throw new Error('File processing failed.')
		}

		if (uploadedFile.uri && uploadedFile.mimeType) {
			const fileContent = createPartFromUri(uploadedFile.uri, uploadedFile.mimeType)
			return fileContent
		}
	}

	throw new Error('File processing failed.')
}

function omitNullFrontmatterFields(value: unknown): unknown {
	if (value === null) return value
	if (typeof value !== 'object') return value
	if (Array.isArray(value)) return value

	return Object.fromEntries(
		Object.entries(value).filter(([, field]) => field !== null || field === '')
	)
}

function parseAndValidateFrontmatter(
	metadata: string,
	schema: JSONSchemaType<PieceFrontmatter>
): PieceFrontmatter {
	const parsed: unknown = JSON.parse(metadata)
	const frontmatter = omitNullFrontmatterFields(parsed)
	const validate = compile(schema)
	if (!validate(frontmatter)) {
		const error = validate.errors?.[0]
		throw new Error(
			`Generated frontmatter does not match schema: ${error?.instancePath || '/'} ${error?.message}`
		)
	}

	return frontmatter
}

async function pieceFrontMatterFromPrompt(
	apiKey: string,
	schema: JSONSchemaType<PieceFrontmatter>,
	prompt: string,
	files?: Array<string | Buffer>
) {
	const genAI = getClient(apiKey)

	const content: ContentListUnion = [prompt]

	if (files) {
		for (const file of files) {
			const part = await extractPartFromFile(file, genAI)
			content.push(part)
		}
	}

	const result = await genAI.models.generateContent({
		model: MODEL_NAME,
		contents: content,
		config: {
			responseMimeType: 'application/json',
			safetySettings: safetySettings,
			responseJsonSchema: schema,
			systemInstruction: `you are an assistant that helps generate JSON metadata for a record that will be added to a collection of similar records. 

if you are provided pdf attachments, images or other text based files, please prioritize them as inputs for generating metadata for the record. 

you are also given a responseJsonSchema to guide your output. each field in the schema has a description and examples to help guide what the intention of each field is and what values to expect.`,
		},
	})

	return parseAndValidateFrontmatter(result.text || '{}', schema)
}

async function validateApiKey(
	apiKey: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
	try {
		const genAI = getClient(apiKey)
		await genAI.models.list()
		return { ok: true }
	} catch (err) {
		return { ok: false, reason: err instanceof Error ? err.message : String(err) }
	}
}

export { pieceFrontMatterFromPrompt, validateApiKey }
