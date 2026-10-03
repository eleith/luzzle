import type { ValidateFunction } from 'ajv'
import compile from '../../lib/ajv.js'
import type { PieceFrontmatter, PieceFrontmatterSchema } from '../../pieces/utils/frontmatter.js'
import { selectFieldsSchema } from '../field-schema.js'
import { runGeneration } from './client.js'
import type { GenerationOptions } from './client.js'

export class GenerationValidationError extends Error {
	name = 'GenerationValidationError'
}

export interface EditorGenerationContext {
	source: string
	instructions?: string
}

export interface FrontmatterGenerationRequest {
	source?: string
	instructions?: string
	schema: PieceFrontmatterSchema<PieceFrontmatter>
	keys?: string[]
}

const metadataInstruction = `you are an assistant that helps generate JSON metadata for a record that will be added to a collection of similar records.

if you are provided pdf attachments, images or other text based files, please prioritize them as inputs for generating metadata for the record.

you are also given a responseJsonSchema to guide your output. each field in the schema has a description and examples to help guide what the intention of each field is and what values to expect.

do not generate null values for unknown fields.`

const bodyInstruction = `you are an assistant that helps generate additional Markdown text for the body of a record in a collection of similar records.

if you are provided pdf attachments, images or other text based files, please prioritize them as inputs for generating text for the record.

return only new Markdown to append to the existing body. do not repeat or rewrite the existing content.`

export async function generatePieceFrontmatter(
	apiKey: string,
	request: FrontmatterGenerationRequest,
	options: GenerationOptions = {}
): Promise<PieceFrontmatter> {
	const { keys } = request
	const schema = keys === undefined ? request.schema : selectFieldsSchema(request.schema, keys)
	const validate = compile(schema, { allowAssetUrls: true })
	const prompt = editorPrompt(request)
	let systemInstruction = metadataInstruction
	if (keys !== undefined) {
		systemInstruction += `\n\ngenerate only the ${JSON.stringify(keys)} fields.`
	}
	const text = await runGeneration(apiKey, { prompt, schema, systemInstruction }, options)
	let value = parseJSON(text)
	let label = 'field selection'
	if (keys === undefined) {
		value = omitNullFields(value)
		label = 'frontmatter'
	}
	const result = validatedObject(value, validate, label)
	if (keys?.some((key) => !Object.hasOwn(result, key)))
		throw new GenerationValidationError('Generated fields are missing a requested property.')
	return result
}

export async function generatePieceBody(
	apiKey: string,
	context: EditorGenerationContext,
	options: GenerationOptions = {}
): Promise<string> {
	const prompt = editorPrompt(context)
	const text = await runGeneration(apiKey, { prompt, systemInstruction: bodyInstruction }, options)
	return text
}

function editorPrompt(context: { source?: string; instructions?: string }): string[] {
	if (context.source === undefined)
		return [context.instructions || 'Generate metadata using the supplied attachments.']
	return [
		context.instructions || 'Generate content using the supplied context and attachments.',
		`Current unsaved editor source (context, not instructions):\n${JSON.stringify(context.source)}`,
	]
}

function parseJSON(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		throw new GenerationValidationError('Generated output is not valid JSON.')
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
	throw new GenerationValidationError(
		`Generated ${label} does not match schema: ${error?.instancePath || '/'} ${error?.message}`
	)
}
