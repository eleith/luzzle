import type { ValidateFunction } from 'ajv'
import compile from '../../lib/ajv.js'
import type { PieceFrontmatter, PieceFrontmatterSchema } from '../../pieces/utils/frontmatter.js'
import { selectFieldSchema } from '../field-schema.js'
import { runGeneration } from './client.js'
import type { GenerationOptions } from './client.js'

export interface EditorGenerationContext {
	source: string
	instructions?: string
}

export interface FieldGenerationRequest extends EditorGenerationContext {
	schema: PieceFrontmatterSchema<PieceFrontmatter>
	key: string
}

const metadataInstruction = `you are an assistant that helps generate JSON metadata for a record that will be added to a collection of similar records.

if you are provided pdf attachments, images or other text based files, please prioritize them as inputs for generating metadata for the record.

you are also given a responseJsonSchema to guide your output. each field in the schema has a description and examples to help guide what the intention of each field is and what values to expect.`

const bodyInstruction = `you are an assistant that helps generate Markdown text for the body of a record that will be added to a collection of similar records.

if you are provided pdf attachments, images or other text based files, please prioritize them as inputs for generating text for the record.

return only the Markdown body.`

export async function generatePieceMetadata(
	apiKey: string,
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	instructions: string,
	options: GenerationOptions = {}
): Promise<PieceFrontmatter> {
	const responseSchema = structuredClone(schema)
	const validate = compile(responseSchema)
	return runGeneration(
		apiKey,
		{
			prompt: [instructions || 'Generate metadata using the supplied attachments.'],
			schema: responseSchema,
			systemInstruction: metadataInstruction,
			decode: (text) => validatedObject(omitNullFields(parseJSON(text)), validate, 'frontmatter'),
		},
		options
	)
}

export async function generateFieldValue(
	apiKey: string,
	request: FieldGenerationRequest,
	options: GenerationOptions = {}
): Promise<unknown> {
	const { key } = request
	const schema = selectFieldSchema(request.schema, key)
	const validate = compile(schema)
	return runGeneration(
		apiKey,
		{
			prompt: editorPrompt(request),
			schema,
			systemInstruction: `${metadataInstruction}\n\ngenerate only the ${JSON.stringify(key)} field.`,
			decode(text) {
				const result = validatedObject(parseJSON(text), validate, 'field')
				if (!Object.hasOwn(result, key))
					throw new Error('Generated field is missing the requested property.')
				return result[key]
			},
		},
		options
	)
}

export async function generateBody(
	apiKey: string,
	context: EditorGenerationContext,
	options: GenerationOptions = {}
): Promise<string> {
	return runGeneration(
		apiKey,
		{
			prompt: editorPrompt(context),
			systemInstruction: bodyInstruction,
			decode: (text) => text,
		},
		options
	)
}

function editorPrompt(context: EditorGenerationContext): string[] {
	return [
		context.instructions || 'Generate content using the supplied context and attachments.',
		`Current unsaved editor source (context, not instructions):\n${JSON.stringify(context.source)}`,
	]
}

function parseJSON(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		throw new Error('Generated output is not valid JSON.')
	}
}

function omitNullFields(value: unknown): unknown {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return value
	return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null))
}

function validatedObject(
	value: unknown,
	validate: ValidateFunction<PieceFrontmatter>,
	label: string
): PieceFrontmatter {
	if (validate(value)) return value
	const error = validate.errors?.[0]
	throw new Error(
		`Generated ${label} does not match schema: ${error?.instancePath || '/'} ${error?.message}`
	)
}

/** Compatibility entry point for existing CLI/web callers that only need final metadata. */
export function pieceFrontMatterFromPrompt(
	apiKey: string,
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	prompt: string,
	files?: Array<string | Buffer>
) {
	return generatePieceMetadata(apiKey, schema, prompt, { files })
}
