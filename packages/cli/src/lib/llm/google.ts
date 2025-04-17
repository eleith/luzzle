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

const MODEL_NAME = 'gemini-2.0-flash'

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

async function pieceFrontMatterFromPrompt(
	apiKey: string,
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	prompt: string,
	file?: string | Buffer
) {
	const genAI = getClient(apiKey)

	const content: ContentListUnion = [prompt]

	if (file) {
		const isBuffer = Buffer.isBuffer(file)
		const fileType = isBuffer ? await fileTypeFromBuffer(file) : await fileTypeFromFile(file)
		const mimeType = fileType?.mime

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
			content.push(fileContent)
		}
	}

	const schemaString = JSON.stringify(schema, null, 2)

	const result = await genAI.models.generateContent({
		model: MODEL_NAME,
		contents: content,
		config: {
			responseMimeType: 'application/json',
			safetySettings: safetySettings,
			systemInstruction: `you are an assistant that helps generate accurate JSON metadata for a record that will be added to a collection. if you are provided an attachment, please attempt to extract values from this attachment and prioritize them. avoid hallucinations, especially for URL and 'asset' fields. any URL should be pre-existing and i should be able to download them successfully.

			the JSON schema to format your response is as follows:

			\`\`\`
			${schemaString}
			\`\`\`

			the properties object may contain a description field and an examples field (amongth others). please use these fields as additional prompts to guide expectations for how to generate them.
			`
		},
	})

	const metadata = result.text || '{}'
	const frontmatter = JSON.parse(metadata) as PieceFrontmatter

	return Object.fromEntries(
		Object.entries(frontmatter).filter(([, value]) => value !== null || value === '')
	)
}

export { pieceFrontMatterFromPrompt }
