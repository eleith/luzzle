import {
	findFrontmatterField,
	generateBody,
	generateFieldValue,
	generatePieceMetadata,
	makePieceMarkdown,
	makePieceMarkdownString,
	setFrontmatterValue,
	type GenerationProgress
} from '@luzzle/core'
import { error } from '@sveltejs/kit'
import type { GenerationResult } from '$lib/generation/types'
import { config } from '../config'
import { getPieces } from '../pieces'
import { getStorage } from '../storage'
import type { CreateGenerationInput, EditGenerationInput } from './input'

export type Generate = (progress: (event: GenerationProgress) => void) => Promise<GenerationResult>

export async function createDraftGenerator(
	input: CreateGenerationInput,
	apiKey: string
): Promise<Generate> {
	const piece = await getConfiguredPiece(input.type)
	await archiveEntry(input.directory || '.', 'directory')
	const title = config.pieces.find((entry) => entry.type === input.type)?.fields.title
	if (
		!title ||
		title.split('.').some((part) => ['__proto__', 'constructor', 'prototype'].includes(part)) ||
		findFrontmatterField(piece.fields, title)?.type !== 'string'
	) {
		error(400, 'This piece type needs a string title field.')
	}
	return async (progress) => {
		const frontmatter = await generatePieceMetadata(
			apiKey,
			piece.schema,
			`${input.instructions}\n\nEntered title: ${JSON.stringify(input.name)}`,
			{ files: input.files, onProgress: progress }
		)
		// Do not use setField(): generation must not download assets or persist anything.
		setFrontmatterValue(frontmatter, title, input.name)
		// The destination is derived afresh on explicit Create, not reserved during generation.
		const draft = makePieceMarkdown('', input.type, '', frontmatter)
		if (!piece.validate(draft).isValid) throw new Error('Invalid generated draft.')
		return { kind: 'creation', markdown: makePieceMarkdownString(draft) }
	}
}

export async function createEditorGenerator(
	input: EditGenerationInput,
	apiKey: string
): Promise<Generate> {
	const pieces = getPieces()
	const file = pieces.parseFilename(input.file)
	if (file.format !== '.md' || pieces.isAsset(input.file)) {
		error(400, 'Choose an archive piece.')
	}
	const piece = await getConfiguredPiece(file.type)
	await archiveEntry(input.file, 'file')
	const target = input.target
	if (
		target.kind === 'field' &&
		(target.key === '__proto__' || !Object.hasOwn(piece.schema.properties, target.key))
	) {
		error(400, 'Choose a top-level metadata field.')
	}
	return async (progress) => {
		const context = { source: input.source, instructions: input.instructions }
		const generationOptions = { files: input.files, onProgress: progress }
		if (target.kind === 'body') {
			return { kind: 'body', value: await generateBody(apiKey, context, generationOptions) }
		}
		return {
			kind: 'field',
			key: target.key,
			value: await generateFieldValue(
				apiKey,
				{ ...context, schema: piece.schema, key: target.key },
				generationOptions
			)
		}
	}
}

async function archiveEntry(path: string, type: 'file' | 'directory') {
	try {
		if ((await getStorage().stat(path)).type !== type) throw new Error('Wrong entry type')
	} catch {
		error(400, `Choose an existing archive ${type}.`)
	}
}

async function getConfiguredPiece(type: string | null) {
	if (!type || !config.pieces.some((entry) => entry.type === type)) {
		error(400, 'Choose a configured piece type.')
	}
	try {
		return await getPieces().getPiece(type)
	} catch {
		error(400, 'Could not prepare the piece schema.')
	}
}
