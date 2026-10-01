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

const MODEL_NAME = 'gemini-3.8-flash'
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000
const FILE_POLL_MS = 5000
const CLEANUP_TIMEOUT_MS = 10_000

export type GenerationProgress = {
	phase: 'preparation' | 'generation' | 'validation'
	message: string
}

export type GenerationLimits = {
	maxFiles: number
	maxFileBytes: number
	maxTotalFileBytes: number
	/** Maximum accepted result text; checked after the SDK receives the response. */
	maxOutputBytes: number
	/** Stop starting new status checks after this wait; active SDK requests may finish. */
	maxFileProcessingMs: number
}

/** Core safety budgets, not measured web deployment limits. */
export const DEFAULT_GENERATION_LIMITS: Readonly<GenerationLimits> = {
	maxFiles: 10,
	maxFileBytes: 50_000_000,
	maxTotalFileBytes: 100_000_000,
	maxOutputBytes: 1_000_000,
	maxFileProcessingMs: 5 * 60 * 1000,
}

export type GenerationOptions = {
	files?: Array<string | Buffer>
	limits?: Partial<GenerationLimits>
	onProgress?: (progress: GenerationProgress) => void | Promise<void>
	onWarning?: (message: string) => void | Promise<void>
}

type GenerationTask<T> = {
	prompt: string[]
	systemInstruction: string
	schema?: PieceFrontmatterSchema<PieceFrontmatter>
	decode: (text: string) => T
}

type GenerationContext = {
	client: GoogleGenAI
	limits: GenerationLimits
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

function generationLimits(options: GenerationOptions, fileCount: number): GenerationLimits {
	const limits = { ...DEFAULT_GENERATION_LIMITS, ...options.limits }
	for (const [key, value] of Object.entries(limits)) {
		if (!Number.isSafeInteger(value) || value <= 0)
			throw new Error(`Invalid generation limit: ${key}.`)
	}
	if (fileCount > limits.maxFiles) throw new Error('Too many generation attachments.')
	return limits
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
		throw new Error(`Gemini file upload failed${status}.`)
	}
	if (typeof uploaded?.name !== 'string' || !uploaded.name) {
		throw new Error('Gemini file upload returned no file name.')
	}
	return uploaded.name
}

async function waitForFile(name: string, context: GenerationContext): Promise<Part> {
	const stopPollingAt = Date.now() + context.limits.maxFileProcessingMs
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
	const { limits } = context
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

function warnAboutCleanup(options: GenerationOptions) {
	const message = 'Could not delete a temporary generation file; provider expiry still applies.'
	const warn = options.onWarning ?? console.warn
	try {
		void Promise.resolve(warn(message)).catch(() => console.warn(message))
	} catch {
		console.warn(message)
	}
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
				warnAboutCleanup(context.options)
			}
		})
	)
}

function completedText(response: GenerateContentResponse, maxOutputBytes: number): string {
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
	if (Buffer.byteLength(text, 'utf8') > maxOutputBytes)
		throw new Error('Generated output exceeds the byte limit.')
	return text
}

async function generateText<T>(
	context: GenerationContext,
	task: GenerationTask<T>,
	attachments: Array<string | Part>
) {
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
	return completedText(response, context.limits.maxOutputBytes)
}

export async function runGeneration<T>(
	apiKey: string,
	task: GenerationTask<T>,
	options: GenerationOptions
): Promise<T> {
	const files = [...(options.files ?? [])]
	const limits = generationLimits(options, files.length)
	const context: GenerationContext = {
		client: getClient(apiKey),
		limits,
		options,
		uploaded: new Set(),
	}
	try {
		progress(context, 'preparation', 'Preparing generation inputs.')
		const attachments = await prepareAttachments(context, files)
		const text = await generateText(context, task, attachments)
		progress(context, 'validation', 'Validating the completed result.')
		return task.decode(text)
	} finally {
		await cleanupFiles(context)
	}
}
