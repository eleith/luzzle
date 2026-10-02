import { error } from '@sveltejs/kit'
import { DEFAULT_GENERATION_LIMITS } from '@luzzle/core'
import type { GenerationTarget } from '$lib/generation/types'
import { MAX_SOURCE_CHARS, MAX_INSTRUCTION_CHARS } from '../constants'

export type CreateGenerationInput = {
	name: string
	type: string
	directory: string
	instructions: string
	files: Buffer[]
}

export type EditGenerationInput = {
	file: string
	source: string
	target: GenerationTarget
	instructions: string
	files: Buffer[]
}

export async function readCreateInput(form: FormData): Promise<CreateGenerationInput> {
	const name = form.get('name')
	const type = form.get('type')
	const directory = form.get('directory') ?? ''
	const instructions = form.get('instructions') ?? ''
	if (typeof name !== 'string' || !name.trim()) error(400, 'Name is required.')
	if (typeof type !== 'string' || !type.trim()) error(400, 'Piece type is required.')
	if (typeof directory !== 'string') error(400, 'Directory must be text.')
	if (typeof instructions !== 'string') error(400, 'Instructions must be text.')
	if (instructions.length > MAX_INSTRUCTION_CHARS) error(413, 'Instructions are too long.')
	return { name, type, directory, instructions, files: await readAttachments(form) }
}

export async function readEditInput(form: FormData): Promise<EditGenerationInput> {
	const file = form.get('file')
	const encodedSource = form.get('source')
	const targetKind = form.get('target')
	const key = form.get('key')
	const instructions = form.get('instructions') ?? ''
	if (typeof file !== 'string' || !file.trim()) error(400, 'Piece file is required.')
	if (typeof encodedSource !== 'string') error(400, 'Editor source is required.')
	if (typeof instructions !== 'string') error(400, 'Instructions must be text.')
	if (instructions.length > MAX_INSTRUCTION_CHARS) error(413, 'Instructions are too long.')

	let target: GenerationTarget
	if (targetKind === 'body') {
		target = { kind: 'body' }
	} else if (targetKind === 'field' && typeof key === 'string' && key) {
		target = { kind: 'field', key }
	} else {
		error(400, 'Choose a field or the body.')
	}

	// JSON preserves the exact editor buffer; multipart text normalizes line endings.
	let source: unknown
	try {
		source = JSON.parse(encodedSource)
	} catch {
		error(400, 'Invalid editor source.')
	}
	if (typeof source !== 'string') error(400, 'Editor source must be text.')
	if (source.length > MAX_SOURCE_CHARS) error(413, 'Editor source is too long.')
	return { file, source, target, instructions, files: await readAttachments(form) }
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
