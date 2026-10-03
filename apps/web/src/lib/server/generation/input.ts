import { error } from '@sveltejs/kit'
import { DEFAULT_GENERATION_LIMITS } from '@luzzle/core'
import { MAX_SOURCE_CHARS, MAX_INSTRUCTION_CHARS } from '../constants'

export type FieldsGenerationInput = {
	source: string
	instructions: string
	files: Buffer[]
	keys: string[]
}

export type BodyGenerationInput = {
	source: string
	instructions: string
	files: Buffer[]
}

export async function readFieldsInput(form: FormData): Promise<FieldsGenerationInput> {
	const instructions = readInstructions(form)
	const source = readSource(form)

	const encodedFields = form.get('fields')
	if (typeof encodedFields !== 'string') error(400, 'Choose metadata fields.')
	let keys: unknown
	try {
		keys = JSON.parse(encodedFields)
	} catch {
		error(400, 'Invalid metadata fields.')
	}
	if (
		!Array.isArray(keys) ||
		keys.length === 0 ||
		!keys.every((key): key is string => typeof key === 'string' && !!key.trim()) ||
		new Set(keys).size !== keys.length
	) {
		error(400, 'Choose distinct metadata fields.')
	}
	const files = await readAttachments(form)
	return { source, instructions, keys, files }
}

export async function readBodyInput(form: FormData): Promise<BodyGenerationInput> {
	const instructions = readInstructions(form)
	const source = readSource(form)
	const files = await readAttachments(form)
	return { source, instructions, files }
}

function readInstructions(form: FormData): string {
	const instructions = form.get('instructions') ?? ''
	if (typeof instructions !== 'string') error(400, 'Instructions must be text.')
	if (instructions.length > MAX_INSTRUCTION_CHARS) error(413, 'Instructions are too long.')
	return instructions
}

function readSource(form: FormData): string {
	// JSON preserves the exact editor buffer; multipart text normalizes line endings.
	const encodedSource = form.get('source')
	if (typeof encodedSource !== 'string') error(400, 'Editor source is required.')
	let source: unknown
	try {
		source = JSON.parse(encodedSource)
	} catch {
		error(400, 'Invalid editor source.')
	}
	if (typeof source !== 'string') error(400, 'Editor source must be text.')
	if (source.length > MAX_SOURCE_CHARS) error(413, 'Editor source is too long.')
	return source
}

async function readAttachments(form: FormData): Promise<Buffer[]> {
	const files: File[] = []
	let bytes = 0
	for (const file of form.getAll('files')) {
		if (typeof file === 'string') error(400, 'Attachments must be files.')
		if (file.size === 0) continue
		if (file.size > DEFAULT_GENERATION_LIMITS.maxFileBytes) error(413, 'Attachment is too large.')
		bytes += file.size
		if (bytes > DEFAULT_GENERATION_LIMITS.maxTotalFileBytes)
			error(413, 'Attachments are too large.')
		files.push(file)
	}
	if (files.length > DEFAULT_GENERATION_LIMITS.maxFiles) error(413, 'Too many attachments.')

	const buffers: Buffer[] = []
	for (const file of files) buffers.push(Buffer.from(await file.arrayBuffer()))
	return buffers
}
