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

async function generatePromptToPieceFrontmatter(
	apiKey: string,
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	prompt: string,
	file?: string | Buffer
) {
	const genAI = getClient(apiKey)
	const schemaString = JSON.stringify(schema, null, 2)
	const instruction = `please respond with JSON that conforms to the following JSON schema:

${schemaString}
	
your goal is to help generate metadata for a piece someone is adding to their collection. the above schema fields may have descriptions, formats patterns and examples that should guide the values you determine are best.

for schema fields of the format "asset", do not hallucinate, only respond with valid http URLs that if tested, could be downloaded successfully.

if you are provided a URL or a file, please prioritze values that are directly sourced from the content itself.`

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

	return JSON.parse(metadata) as Record<string, string | number | boolean>
}

export { generatePromptToPieceFrontmatter }
