import { error } from '@sveltejs/kit'
import {
	generatePieceBody,
	generatePieceFrontmatter,
	mergeGeneratedFields,
	appendGeneratedBody,
	type GenerationProgress,
	type PieceFrontmatter,
	type PieceFrontmatterSchema
} from '@luzzle/core'
import type { GenerationResult } from '$lib/generation/types'
import { config } from './config'
import { getPieces } from './pieces'
import {
	readFieldsInput,
	readBodyInput,
	type FieldsGenerationInput,
	type BodyGenerationInput
} from './generation/input'
import { createGenerationStream } from './generation/stream'
import { MAX_CONCURRENT_GENERATIONS } from './constants'

let active = 0

export async function generateResponse(request: Request): Promise<Response> {
	const ai = config.ai
	if (!ai) error(503, 'AI is not configured.')
	if (active >= MAX_CONCURRENT_GENERATIONS) error(429, 'Generation is busy. Please try again.')

	// Reserve before consuming multipart data; disconnected accepted work still owns its slot.
	active++
	const release = () => active--
	try {
		const form = await request.formData()
		const target = form.get('target')
		if (target === 'fields') {
			return await generateFieldsResponse(request, form, ai.api_key, release)
		}
		if (target === 'body') {
			return await generateBodyResponse(request, form, ai.api_key, release)
		}
		error(400, 'Choose metadata fields or the body.')
	} catch (cause) {
		release()
		throw cause
	}
}

async function generateFieldsResponse(
	request: Request,
	form: FormData,
	apiKey: string,
	release: () => void
): Promise<Response> {
	const file = form.get('file')
	if (typeof file !== 'string' || !file.trim()) error(400, 'Piece file is required.')
	const input = await readFieldsInput(form)
	const schema = await loadFieldSchema(file)
	const unknownKeys = input.keys.some(
		(key) => key === '__proto__' || !Object.hasOwn(schema.properties, key)
	)
	if (unknownKeys) error(400, 'Choose top-level metadata fields.')

	const stream = createGenerationStream(request)
	const work = generateFieldsDocument(apiKey, input, schema, stream.progress)
	void stream.sendResult(work, release)
	return stream.response
}

async function generateBodyResponse(
	request: Request,
	form: FormData,
	apiKey: string,
	release: () => void
): Promise<Response> {
	const input = await readBodyInput(form)
	const stream = createGenerationStream(request)
	const work = generateBodyDocument(apiKey, input, stream.progress)
	void stream.sendResult(work, release)
	return stream.response
}

async function loadFieldSchema(file: string): Promise<PieceFrontmatterSchema<PieceFrontmatter>> {
	const pieces = getPieces()
	const filename = pieces.parseFilename(file)
	if (filename.format !== '.md' || pieces.isAsset(file)) error(400, 'Choose an archive piece.')
	const type = filename.type
	if (!type || !config.pieces.some((entry) => entry.type === type)) {
		error(400, 'Choose a configured piece type.')
	}
	try {
		const piece = await pieces.getPiece(type)
		return piece.schema
	} catch {
		error(400, 'Could not load the piece schema.')
	}
}

async function generateFieldsDocument(
	apiKey: string,
	input: FieldsGenerationInput,
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	progress: (event: GenerationProgress) => void
): Promise<GenerationResult> {
	const fields = await generatePieceFrontmatter(
		apiKey,
		{ source: input.source, instructions: input.instructions, schema, keys: input.keys },
		{ files: input.files, onProgress: progress }
	)
	const markdown = await mergeGeneratedFields(input.source, fields)
	return { markdown }
}

async function generateBodyDocument(
	apiKey: string,
	input: BodyGenerationInput,
	progress: (event: GenerationProgress) => void
): Promise<GenerationResult> {
	const body = await generatePieceBody(
		apiKey,
		{ source: input.source, instructions: input.instructions },
		{ files: input.files, onProgress: progress }
	)
	const markdown = appendGeneratedBody(input.source, body)
	return { markdown }
}
