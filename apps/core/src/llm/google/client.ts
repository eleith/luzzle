import { createReadStream } from 'node:fs'
import path from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import {
	ApiError,
	createPartFromUri,
	GoogleGenAI,
	HarmCategory,
	HarmBlockThreshold,
} from '@google/genai'
import type { File as GeminiFile, GenerateContentResponse, Part } from '@google/genai'
import type { PieceFrontmatter, PieceFrontmatterSchema } from '../../pieces/utils/frontmatter.js'
import {
	MODEL_NAME,
	REQUEST_TIMEOUT_MS,
	FILE_POLL_MS,
	CLEANUP_TIMEOUT_MS,
	DEFAULT_GENERATION_LIMITS,
} from './constants.js'

export type GenerationProgress = {
	phase: 'preparation' | 'generation' | 'validation'
	message: string
}

export type GenerationOptions = {
	files?: Array<string | Buffer>
	onProgress?: (progress: GenerationProgress) => void | Promise<void>
}

type GenerationTask = {
	prompt: string[]
	systemInstruction: string
	schema?: PieceFrontmatterSchema<PieceFrontmatter>
}

type GenerationContext = {
	client: GoogleGenAI
	options: GenerationOptions
	uploaded: Set<string>
}

function getClient(apiKey: string) {
	return new GoogleGenAI({ apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS } })
}

export async function validateApiKey(
	apiKey: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
	try {
		await getClient(apiKey).models.list()
		return { ok: true }
	} catch (error) {
		return { ok: false, reason: error instanceof Error ? error.message : String(error) }
	}
}

function progress(context: GenerationContext, phase: GenerationProgress['phase'], message: string) {
	// Losing a progress subscriber must not interrupt accepted work.
	try {
		void Promise.resolve(context.options.onProgress?.({ phase, message })).catch(() => {})
	} catch {
		/* best-effort notification */
	}
}

async function readInput(file: string | Buffer, maxBytes: number): Promise<Buffer<ArrayBuffer>> {
	if (Buffer.isBuffer(file)) {
		if (file.length > maxBytes) throw new Error('Attachment exceeds the file or total byte limit.')
		return Buffer.from(file)
	}
	const chunks: Buffer[] = []
	let bytes = 0
	for await (const chunk of createReadStream(file, { highWaterMark: 64 * 1024 })) {
		bytes += chunk.length
		if (bytes > maxBytes) throw new Error('Attachment exceeds the file or total byte limit.')
		chunks.push(chunk)
	}
	return Buffer.concat(chunks, bytes)
}

async function uploadFile(
	client: GoogleGenAI,
	bytes: Uint8Array<ArrayBuffer>,
	mimeType: string
): Promise<string> {
	let uploaded: GeminiFile
	try {
		uploaded = await client.files.upload({
			file: new Blob([bytes], { type: mimeType }),
			config: { mimeType, displayName: 'luzzle-generation-input' },
		})
	} catch (error) {
		const status = error instanceof ApiError ? ` (HTTP ${error.status})` : ''
		throw new Error(`Gemini file upload failed${status}.`, { cause: error })
	}
	if (typeof uploaded?.name !== 'string' || !uploaded.name) {
		throw new Error('Gemini file upload returned no file name.')
	}
	return uploaded.name
}

async function waitForFile(name: string, context: GenerationContext): Promise<Part> {
	const stopPollingAt = Date.now() + DEFAULT_GENERATION_LIMITS.maxFileProcessingMs
	while (Date.now() < stopPollingAt) {
		const file = await context.client.files.get({ name })
		if (file.state === 'ACTIVE' && file.uri && file.mimeType)
			return createPartFromUri(file.uri, file.mimeType)
		if (file.state !== 'PROCESSING')
			throw new Error('Attachment processing failed or returned incomplete file metadata.')
		const remaining = stopPollingAt - Date.now()
		if (remaining <= 0) break
		await new Promise<void>((resolve) => setTimeout(resolve, Math.min(FILE_POLL_MS, remaining)))
	}
	throw new Error('Attachment processing exceeded the wait limit.')
}

async function prepareAttachments(context: GenerationContext, files: Array<string | Buffer>) {
	const limits = DEFAULT_GENERATION_LIMITS
	const parts: Array<string | Part> = []
	let totalBytes = 0
	for (const [index, file] of files.entries()) {
		progress(context, 'preparation', `Preparing attachment ${index + 1} of ${files.length}.`)
		const bytes = await readInput(
			file,
			Math.min(limits.maxFileBytes, limits.maxTotalFileBytes - totalBytes)
		)
		totalBytes += bytes.length
		const type = await fileTypeFromBuffer(bytes)
		if (!type) {
			const name = typeof file === 'string' ? path.basename(file) : 'text attachment'
			parts.push(
				`---[start] embedding ${name}---\n${bytes.toString('utf8')}\n---[end] embedding ${name}---`
			)
			continue
		}
		const name = await uploadFile(context.client, bytes, type.mime)
		context.uploaded.add(name)
		progress(context, 'preparation', `Processing attachment ${index + 1} of ${files.length}.`)
		parts.push(await waitForFile(name, context))
	}
	return parts
}

async function cleanupFiles(context: GenerationContext) {
	await Promise.all(
		[...context.uploaded].map(async (name) => {
			try {
				await context.client.files.delete({
					name,
					config: { httpOptions: { timeout: CLEANUP_TIMEOUT_MS } },
				})
			} catch {
				// Provider errors may include credentials or user content; don't expose them.
				console.warn(
					'Could not delete a temporary generation file; provider expiry still applies.'
				)
			}
		})
	)
}

function completedText(response: GenerateContentResponse): string {
	if (
		response.promptFeedback?.blockReason &&
		response.promptFeedback.blockReason !== 'BLOCKED_REASON_UNSPECIFIED'
	) {
		throw new Error('Generation was blocked by the provider.')
	}
	const candidates = response.candidates ?? []
	if (candidates.length !== 1 || (candidates[0].index !== undefined && candidates[0].index !== 0)) {
		throw new Error('Generation returned unexpected candidates.')
	}
	const candidate = candidates[0]
	if (candidate.safetyRatings?.some((rating) => rating.blocked))
		throw new Error('Generation was blocked by the provider.')
	if (candidate.finishReason !== 'STOP') {
		throw new Error(
			`Generation did not finish successfully (${candidate.finishReason ?? 'missing finish reason'}).`
		)
	}
	let text = ''
	for (const part of candidate.content?.parts ?? []) {
		if (part.thought) continue
		if (typeof part.text !== 'string') throw new Error('Generation returned non-text output.')
		text += part.text
	}
	if (!text.trim()) throw new Error('Generation returned empty output.')
	if (Buffer.byteLength(text, 'utf8') > DEFAULT_GENERATION_LIMITS.maxOutputBytes)
		throw new Error('Generated output exceeds the byte limit.')
	return text
}

export async function runGeneration(
	apiKey: string,
	task: GenerationTask,
	options: GenerationOptions
): Promise<string> {
	const files = options.files ?? []
	if (files.length > DEFAULT_GENERATION_LIMITS.maxFiles)
		throw new Error('Too many generation attachments.')
	const context: GenerationContext = {
		client: getClient(apiKey),
		options,
		uploaded: new Set(),
	}
	try {
		progress(context, 'preparation', 'Preparing generation inputs.')
		const attachments = await prepareAttachments(context, files)
		progress(context, 'generation', 'Generating content.')
		const response = await context.client.models.generateContent({
			model: MODEL_NAME,
			contents: [...task.prompt, ...attachments],
			config: {
				candidateCount: 1,
				systemInstruction: task.systemInstruction,
				...(task.schema
					? { responseMimeType: 'application/json', responseJsonSchema: task.schema }
					: {}),
				safetySettings: [
					{
						category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
						threshold: HarmBlockThreshold.BLOCK_NONE,
					},
					{
						category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
						threshold: HarmBlockThreshold.BLOCK_NONE,
					},
				],
			},
		})
		progress(context, 'validation', 'Validating the completed result.')
		return completedText(response)
	} finally {
		await cleanupFiles(context)
	}
}
