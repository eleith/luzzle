import { Content, GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { PieceFrontmatter, PieceFrontmatterSchema } from '@luzzle/core'
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type'

const MODEL_NAME = 'gemini-1.5-flash'

const generationConfig: GenerationConfig = {
	temperature: 1,
	topK: 64,
	topP: 0.95,
	maxOutputTokens: 8192,
	responseMimeType: 'application/json',
}

function getClient(apiKey: string) {
	return new GoogleGenerativeAI(apiKey)
}

async function pieceFrontMatterFromPrompt(
	apiKey: string,
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	prompt: string,
	file?: string | Buffer
) {
	const genAI = getClient(apiKey)
	const schemaString = JSON.stringify(schema, null, 2)
	const instruction = `please respond with a JSON output that conforms to the following JSON schema:

\`${schemaString}\`
	
your goal is to help generate accurate metadata for a record that will be added to a collection. the JSON schema fields may have descriptions, formats, patterns and examples that can guide expectations.

avoid hallucinations, especially for URL and 'asset' fields. any URL should be pre-existing and i should be able to download them successfully.

if you are provided an attachment, please attempt to extract values from this attachment and prioritze them.`

	const userPrompt: Content = {
		role: 'user',
		parts: [
			{
				text: prompt,
			},
		],
	}

	if (file) {
		const fileManager = new GoogleAIFileManager(apiKey)
		const isBuffer = Buffer.isBuffer(file)
		const fileType = isBuffer ? await fileTypeFromBuffer(file) : await fileTypeFromFile(file)
		const mimeType = fileType?.mime

		if (!mimeType) {
			throw new Error(`unsupported file or buffer`)
		}

		const uploadResponse = await fileManager.uploadFile(file, { mimeType })
		userPrompt.parts = [
			{
				fileData: {
					fileUri: uploadResponse.file.uri,
					mimeType: uploadResponse.file.mimeType,
				},
			},
			// // this is to only be used for images
			// {
			// 	inlineData: {
			// 		data: Buffer.from(await readFile(file, 'utf-8')).toString('base64'),
			// 		mimeType,
			// 	},
			// },
			{
				text: prompt,
			},
		]
	}

	const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: instruction })
	const result = await model.generateContent({
		contents: [userPrompt],
		generationConfig,
	})

	const metadata = result.response.text()
	const frontmatter = JSON.parse(metadata) as PieceFrontmatter

	return Object.fromEntries(
		Object.entries(frontmatter).filter(([, value]) => value !== null || value === '')
	)
}

export { pieceFrontMatterFromPrompt }
