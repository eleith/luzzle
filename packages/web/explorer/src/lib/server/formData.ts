import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'
import {
	type Piece,
	type PieceFrontmatter,
	type PieceMarkdown,
	findFrontmatterField
} from '@luzzle/core'

type FormOperations = {
	removes: Set<string>
	downloads: Map<string, string[]>
	uploads: Map<string, File[]>
	sets: Map<string, FormDataEntryValue[]>
	updatePaths: Set<string>
}

function parseFormData(formData: FormData): FormOperations {
	const ops: FormOperations = {
		removes: new Set(),
		downloads: new Map(),
		uploads: new Map(),
		sets: new Map(),
		updatePaths: new Set()
	}

	for (const [key, value] of formData.entries()) {
		if (!key.startsWith('frontmatter.')) continue

		const parts = key.split('.')
		// parts[0] is 'frontmatter'
		const action = parts[1] // remove, download, upload, or field name

		if (action === 'remove') {
			const path = parts.slice(2).join('.')
			ops.removes.add(path)
		} else if (action === 'download') {
			const path = parts.slice(2).join('.')
			if (typeof value === 'string' && value.length > 0) {
				const current = ops.downloads.get(path) || []
				current.push(value)
				ops.downloads.set(path, current)
				ops.updatePaths.add(path)
			}
		} else if (action === 'upload') {
			const path = parts.slice(2).join('.')
			if (value instanceof File && value.size > 0) {
				const current = ops.uploads.get(path) || []
				current.push(value)
				ops.uploads.set(path, current)
				ops.updatePaths.add(path)
			}
		} else {
			// Standard Set (scalar or array item)
			const path = parts.slice(1).join('.')
			const current = ops.sets.get(path) || []
			current.push(value)
			ops.sets.set(path, current)
			ops.updatePaths.add(path)
		}
	}

	return ops
}

/**
 * Applies FormData changes directly to the piece markdown using path-based operations.
 * Implements a strict Two-Phase strategy:
 * 1. Removals (Clear arrays/objects)
 * 2. Updates (Set values, upload files)
 * This ensures deterministic behavior without relying on path sorting magic.
 */
async function applyFormDataToPiece<T extends PieceFrontmatter>(
	piece: Piece<T>,
	markdown: PieceMarkdown<T>,
	formData: FormData
): Promise<PieceMarkdown<T>> {
	let updatedMarkdown = markdown
	const ops = parseFormData(formData)

	// --- PHASE 1: REMOVALS ---
	// Must happen first to clear containers (like arrays) before repopulating
	for (const path of ops.removes) {
		const field = findFrontmatterField(piece.fields, path)
		if (field) {
			updatedMarkdown = await piece.removeField(updatedMarkdown, path)
		}
	}

	// --- PHASE 2: UPDATES ---
	for (const path of ops.updatePaths) {
		const field = findFrontmatterField(piece.fields, path)
		if (!field) continue

		const isArray = field.type === 'array'

		// PRIORITY: Upload > Download > Set
		// This ensures that if a user uploads a new file, it overrides the hidden "existing value" input.

		// 2a. Handle Uploads
		if (ops.uploads.has(path)) {
			const files = ops.uploads.get(path)!
			try {
				const streams = files.map((file) =>
					Readable.fromWeb(file.stream() as ReadableStream<Buffer>)
				)

				if (streams.length) {
					const val = isArray ? streams : streams[0]
					updatedMarkdown = await piece.setField(updatedMarkdown, path, val)
				}
			} catch (error) {
				console.error(`Error uploading file for ${path}: ${error}`)
			}
			continue // Skip other operations for this path
		}

		// 2b. Handle Downloads
		if (ops.downloads.has(path)) {
			const urls = ops.downloads.get(path)!
			try {
				if (urls.length) {
					const val = isArray ? urls : urls[0]
					updatedMarkdown = await piece.setField(updatedMarkdown, path, val)
				}
			} catch (error) {
				console.error(`Error downloading file for ${path}: ${error}`)
			}
			continue // Skip other operations for this path
		}

		// 2c. Handle Standard Sets
		if (ops.sets.has(path)) {
			const inputs = ops.sets.get(path)!

			if (isArray) {
				// Filter empty strings for bulk array updates
				// Cast inputs to string[] is safe for text inputs
				const validInputs = inputs.filter((i) => i !== '')
				if (validInputs.length > 0) {
					updatedMarkdown = await piece.setField(updatedMarkdown, path, validInputs)
				}
			} else {
				// For scalars, take the last value (standard form behavior)
				const val = inputs[inputs.length - 1]
				updatedMarkdown = await piece.setField(updatedMarkdown, path, val)
			}
		}
	}

	return updatedMarkdown
}

async function extractNoteFromFormData(formData: FormData) {
	const note = formData.get('note') || ''
	return note.toString().replace(/\r\n/g, '\n')
}

export { applyFormDataToPiece, extractNoteFromFormData }
