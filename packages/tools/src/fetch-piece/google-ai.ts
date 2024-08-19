import { Content, GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'
import { readFile } from 'fs/promises'
import path from 'path'

const MODEL_NAME = 'gemini-1.5-flash'

const generationConfig: GenerationConfig = {
	temperature: 1,
	topK: 64,
	topP: 0.95,
	maxOutputTokens: 8192,
	responseMimeType: 'application/json',
	// responseSchema: {
	// 	type: FunctionDeclarationSchemaType.OBJECT,
	// 	items: {
	// 		type: FunctionDeclarationSchemaType.OBJECT,
	// 		properties: {
	// 			asset: {
	// 				description: 'a URL to an asset on the internet',
	// 				example: 'https://example.com/image.jpg',
	// 				type: FunctionDeclarationSchemaType.STRING,
	// 			},
	// 		},
	// 	},
	// 	required: [],
	// },
}

function getClient(apiKey: string) {
	return new GoogleGenerativeAI(apiKey)
}

async function generateMetadataFromPrompt(
	apiKey: string,
	schemaPath: string,
	prompt: string,
	file?: string
) {
	const genAI = getClient(apiKey)
	const schemaString = await readFile(schemaPath, 'utf-8')
	const instruction = `please generate a json response that conforms to the following JSON schema:

		${schemaString}
	
	extract as many accurate non-null values for the given prompt and any provided file. do not include null values. any field of the format "asset" should instead be a valid URL to an asset on the internet.`

	const userPrompt: Content = {
		role: 'user',
		parts: [
			{
				text: `please extract the desired JSON representation for: ${prompt}`,
			},
		],
	}

	if (file) {
		const data = await readFile(file, 'utf-8')
		const extension = path.extname(file)

		userPrompt.parts = [
			{
				text: `please extract a desired JSON representation for ${prompt} which is based on the attached file`,
			},
			{
				inlineData: {
					data: Buffer.from(data).toString('base64'),
					mimeType: `text/${extension.slice(1)}`,
				},
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

export { generateMetadataFromPrompt }
