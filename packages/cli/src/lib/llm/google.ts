import { PieceFrontmatter, PieceFrontmatterSchema } from '@luzzle/core'
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type'
import {
	ContentListUnion,
	createPartFromUri,
	GoogleGenAI,
	HarmCategory,
	HarmBlockThreshold,
	SafetySetting,
} from '@google/genai'
import { readFile } from 'fs/promises'
import path from 'path'

const MODEL_NAME = 'gemini-2.5-pro'

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

async function pieceFrontMatterFromPrompt(
	apiKey: string,
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
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

	const metadata = result.text || '{}'
	const frontmatter = JSON.parse(metadata) as PieceFrontmatter

	return Object.fromEntries(
		Object.entries(frontmatter).filter(([, value]) => value !== null || value === '')
	)
}

export { pieceFrontMatterFromPrompt }
