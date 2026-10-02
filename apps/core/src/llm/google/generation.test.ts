import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Readable } from 'node:stream'
import type { ReadStream, createReadStream } from 'node:fs'
import type { fileTypeFromBuffer } from 'file-type'
import type * as GeminiSDK from '@google/genai'
import type { JSONSchemaType } from 'ajv'
import {
	ApiError,
	FileState,
	FinishReason,
	GenerateContentResponse,
	GoogleGenAI,
} from '@google/genai'
import type { PieceFrontmatter } from '../../pieces/utils/frontmatter.js'
import {
	DEFAULT_GENERATION_LIMITS,
	pieceFrontMatterFromPrompt,
	generatePieceMetadata,
	generateFieldValue,
	generateBody,
	validateApiKey,
} from './index.js'
import type { GenerationOptions } from './index.js'

const mocks = vi.hoisted(() => ({
	generate: vi.fn<GoogleGenAI['models']['generateContent']>(),
	get: vi.fn<GoogleGenAI['files']['get']>(),
	delete: vi.fn<GoogleGenAI['files']['delete']>(),
	list: vi.fn<GoogleGenAI['models']['list']>(),
	upload: vi.fn<GoogleGenAI['files']['upload']>(),
	fileType: vi.fn<typeof fileTypeFromBuffer>(),
	readStream: vi.fn<typeof createReadStream>(),
}))

vi.mock('@google/genai', async (original) => ({
	...(await original<typeof GeminiSDK>()),
	GoogleGenAI: vi.fn(function () {
		return {
			models: { generateContent: mocks.generate, list: mocks.list },
			files: { upload: mocks.upload, get: mocks.get, delete: mocks.delete },
		}
	}),
}))
vi.mock('file-type', () => ({ fileTypeFromBuffer: mocks.fileType }))
vi.mock('node:fs', () => ({ createReadStream: mocks.readStream }))

function schema(): JSONSchemaType<PieceFrontmatter> {
	return {
		title: 'books',
		type: 'object',
		properties: { title: { type: 'string' }, keywords: { type: 'string', nullable: true } },
		required: ['title'],
		additionalProperties: false,
	} as unknown as JSONSchemaType<PieceFrontmatter>
}
function response(text?: string, finishReason = FinishReason.STOP): GenerateContentResponse {
	return Object.assign(new GenerateContentResponse(), {
		candidates: [{ content: { parts: text === undefined ? [] : [{ text }] }, finishReason }],
	})
}
function respond(text: string, finishReason = FinishReason.STOP) {
	mocks.generate.mockResolvedValue(response(text, finishReason))
}
function binary() {
	mocks.fileType.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' })
}
function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
async function until(condition: () => boolean) {
	for (let i = 0; i < 100; i++) {
		if (condition()) return
		await Promise.resolve()
	}
	throw new Error('Expected asynchronous operation did not start')
}
// Small byte budgets exercise boundaries without allocating deployment-sized fixtures.
const originalLimits = { ...DEFAULT_GENERATION_LIMITS }
const run = (options: GenerationOptions = {}) =>
	generatePieceMetadata('test-key', schema(), 'My instructions', options)

beforeEach(() => {
	Object.values(mocks).forEach((mock) => mock.mockReset())
	vi.mocked(GoogleGenAI).mockClear()
	respond('{"title":"generated"}')
	mocks.fileType.mockResolvedValue(undefined)
	mocks.upload.mockResolvedValue({ name: 'files/uploaded' })
	mocks.get.mockResolvedValue({
		state: FileState.ACTIVE,
		uri: 'https://provider/fresh-uri',
		mimeType: 'application/pdf',
	})
	mocks.delete.mockResolvedValue({})
	mocks.list.mockResolvedValue({} as never)
})
afterEach(() => {
	Object.assign(DEFAULT_GENERATION_LIMITS, originalLimits)
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('validated generation', () => {
	test('retains the original metadata instruction and adds only the field restriction', async () => {
		const original = [
			'you are an assistant that helps generate JSON metadata for a record that will be added to a collection of similar records.',
			'if you are provided pdf attachments, images or other text based files, please prioritize them as inputs for generating metadata for the record.',
			'you are also given a responseJsonSchema to guide your output. each field in the schema has a description and examples to help guide what the intention of each field is and what values to expect.',
		].join('\n\n')
		await run()
		expect(mocks.generate.mock.calls[0][0].config!.systemInstruction).toBe(original)

		respond('{"keywords":"new"}')
		await generateFieldValue('key', { schema: schema(), key: 'keywords', source: '' })
		expect(mocks.generate.mock.calls[1][0].config!.systemInstruction).toBe(
			`${original}\n\ngenerate only the "keywords" field.`
		)
	})

	test('reports semantic phases and returns validated metadata', async () => {
		const onProgress = vi.fn()
		await expect(run({ onProgress })).resolves.toEqual({ title: 'generated' })
		expect(onProgress.mock.calls.map(([event]) => event.phase)).toEqual([
			'preparation',
			'generation',
			'validation',
		])
		expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				model: 'gemini-3.8-flash',
				contents: ['My instructions'],
				config: expect.objectContaining({
					candidateCount: 1,
					responseMimeType: 'application/json',
					responseJsonSchema: schema(),
				}),
			})
		)
	})

	test.each([
		{ text: '{"title":"new"}', valid: true },
		{ text: '{"title":42}', valid: false },
	])(
		'publishes no result until the full response and validation complete: $text',
		async ({ text, valid }) => {
			const pending = deferred<GenerateContentResponse>()
			mocks.generate.mockReturnValue(pending.promise)
			const onProgress = vi.fn()
			const resolved = vi.fn()
			const rejected = vi.fn()
			const generating = run({ onProgress }).then(resolved, rejected)
			await until(() => mocks.generate.mock.calls.length === 1)
			expect(resolved).not.toHaveBeenCalled()
			expect(rejected).not.toHaveBeenCalled()
			expect(onProgress.mock.calls.map(([event]) => event.phase)).toEqual([
				'preparation',
				'generation',
			])
			pending.resolve(response(text))
			await generating
			if (!valid) {
				expect(resolved).not.toHaveBeenCalled()
				expect(rejected).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ message: expect.stringContaining('does not match schema') })
				)
			} else {
				expect(resolved).toHaveBeenCalledExactlyOnceWith({ title: 'new' })
				expect(rejected).not.toHaveBeenCalled()
			}
		}
	)

	test('compatibility wrapper keeps full-metadata null stripping and empty strings', async () => {
		respond('{"title":"","keywords":null}')
		await expect(pieceFrontMatterFromPrompt('test-key', schema(), 'prompt')).resolves.toEqual({
			title: '',
		})
		respond('{"title":"value","keywords":""}')
		await expect(pieceFrontMatterFromPrompt('test-key', schema(), 'prompt')).resolves.toEqual({
			title: 'value',
			keywords: '',
		})
	})

	test.each([
		['{"title":null}', "must have required property 'title'"],
		['{"title":42}', '/title must be string'],
		['{"title":"new","extra":true}', 'must NOT have additional properties'],
		['null', 'must be object'],
		['[]', 'must be object'],
		['"text"', 'must be object'],
		['{"title":', 'not valid JSON'],
	])('rejects invalid completed metadata %s', async (text, error) => {
		respond(text)
		await expect(pieceFrontMatterFromPrompt('test-key', schema(), 'prompt')).rejects.toThrow(error)
	})

	test('validates schema constraints and core formats', async () => {
		const metadataSchema = schema()
		metadataSchema.properties.title = { type: 'string', format: 'date' }
		respond('{"title":"not-a-date"}')
		await expect(generatePieceMetadata('key', metadataSchema, 'prompt')).rejects.toThrow(
			'must match format'
		)
	})

	test('generates one field without imposing other required fields or stripping its null value', async () => {
		respond('{"keywords":null}')
		const source = '---\ntitle: unsaved title\nkeywords: old\n---\nunsaved notes'
		const result = await generateFieldValue('key', {
			schema: schema(),
			key: 'keywords',
			source,
			instructions: 'Choose keywords',
		})
		expect(result).toBeNull()
		expect(mocks.generate.mock.calls[0][0]).toMatchObject({
			contents: ['Choose keywords', expect.stringContaining(JSON.stringify(source))],
			config: {
				responseJsonSchema: {
					type: 'object',
					properties: { keywords: { type: 'string', nullable: true } },
					required: ['keywords'],
					additionalProperties: false,
				},
			},
		})
	})

	test.each(['{}', '{"keywords":42}', '{"keywords":"value","title":"extra"}'])(
		'rejects invalid field output %s',
		async (text) => {
			respond(text)
			await expect(
				generateFieldValue('key', {
					schema: schema(),
					key: 'keywords',
					source: '',
				})
			).rejects.toThrow('Generated field does not match schema')
		}
	)

	test('requires an own field value, even for names inherited from Object.prototype', async () => {
		const fieldSchema = {
			type: 'object',
			properties: { constructor: true },
		} as unknown as JSONSchemaType<PieceFrontmatter>
		respond('{}')
		await expect(
			generateFieldValue('key', {
				schema: fieldSchema,
				key: 'constructor',
				source: '',
			})
		).rejects.toThrow('missing the requested property')
	})

	test('both operations snapshot their schema and context before invoking callbacks', async () => {
		const metadataSchema = schema()
		const metadata = await generatePieceMetadata('key', metadataSchema, '', {
			onProgress: () => {
				metadataSchema.properties.title = { type: 'number' }
			},
		})
		expect(metadata).toEqual({ title: 'generated' })

		const fieldRequest = {
			schema: schema(),
			key: 'keywords',
			source: 'original context',
		}
		respond('{"keywords":"new"}')
		const value = await generateFieldValue('key', fieldRequest, {
			onProgress: () => {
				fieldRequest.key = 'title'
				fieldRequest.source = 'changed context'
			},
		})
		expect(value).toBe('new')
		expect(mocks.generate.mock.calls[1][0].contents).toContainEqual(
			expect.stringContaining('original context')
		)
	})

	test('supports a complete array or object value', async () => {
		const arraySchema = schema()
		arraySchema.properties.title = {
			type: 'array',
			items: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
		} as typeof arraySchema.properties.title
		respond('{"title":[{"name":"new"}]}')
		await expect(
			generateFieldValue('key', { schema: arraySchema, key: 'title', source: '' })
		).resolves.toEqual([{ name: 'new' }])
	})

	test('body generation returns Markdown exactly and does not request metadata JSON', async () => {
		respond('\n# Notes\n\n  trailing whitespace  \n')
		const source = 'unsaved source'
		await expect(generateBody('key', { source })).resolves.toBe(
			'\n# Notes\n\n  trailing whitespace  \n'
		)
		const config = mocks.generate.mock.calls[0][0].config!
		expect(config.responseJsonSchema).toBeUndefined()
		expect(config.responseMimeType).toBeUndefined()
		expect(config.systemInstruction).toContain('Markdown')
		expect(mocks.generate.mock.calls[0][0].contents).toContainEqual(
			expect.stringContaining(JSON.stringify(source))
		)
	})

	test.each([undefined, '', ' \n '])('rejects empty completed body output %j', async (text) => {
		mocks.generate.mockResolvedValue(response(text))
		await expect(generateBody('key', { source: '' })).rejects.toThrow('empty output')
	})

	test.each([FinishReason.MAX_TOKENS, FinishReason.SAFETY, FinishReason.OTHER])(
		'rejects provider finish reason %s even with valid JSON',
		async (reason) => {
			respond('{"title":"new"}', reason)
			await expect(run()).rejects.toThrow('Generation did not finish successfully')
		}
	)

	test('rejects a missing finish reason even with valid JSON', async () => {
		const result = response('{"title":"new"}')
		delete result.candidates![0].finishReason
		mocks.generate.mockResolvedValue(result)
		await expect(run()).rejects.toThrow('Generation did not finish successfully')
	})

	test('rejects a completed response without content instead of inventing empty metadata', async () => {
		mocks.generate.mockResolvedValue(
			Object.assign(new GenerateContentResponse(), {
				candidates: [{ finishReason: FinishReason.STOP }],
			})
		)
		await expect(run()).rejects.toThrow('empty output')
	})

	test('ignores hidden thought text and combines visible text parts', async () => {
		const result = response()
		result.candidates![0].content!.parts = [
			{ text: 'private reasoning', thought: true },
			{ text: '{"title":' },
			{ text: '"new"}' },
		]
		mocks.generate.mockResolvedValue(result)
		await expect(run()).resolves.toEqual({ title: 'new' })
	})

	test.each([{}, { candidates: [] }, { candidates: [{ index: 1 }] }, { candidates: [{}, {}] }])(
		'rejects missing or unexpected candidates: %j',
		async (data) => {
			mocks.generate.mockResolvedValue(Object.assign(new GenerateContentResponse(), data))
			await expect(run()).rejects.toThrow('Generation returned unexpected candidates.')
		}
	)

	test.each([
		{ promptFeedback: { blockReason: 'SAFETY' } },
		{ candidates: [{ safetyRatings: [{ blocked: true }], finishReason: FinishReason.STOP }] },
	])('rejects provider-blocked output: %j', async (data) => {
		mocks.generate.mockResolvedValue(Object.assign(response('{"title":"new"}'), data))
		await expect(run()).rejects.toThrow('blocked')
	})

	test('rejects non-text output even alongside valid JSON', async () => {
		const result = response('{"title":"new"}')
		result.candidates![0].content!.parts!.push({ functionCall: { name: 'unexpected' } })
		mocks.generate.mockResolvedValue(result)
		await expect(run()).rejects.toThrow('non-text')
	})

	test('allows an unspecified prompt block reason', async () => {
		const result = Object.assign(response('{"title":"new"}'), {
			promptFeedback: { blockReason: 'BLOCKED_REASON_UNSPECIFIED' },
		})
		mocks.generate.mockResolvedValue(result as GenerateContentResponse)
		await expect(run()).resolves.toEqual({ title: 'new' })
	})
})

describe('input preparation and cleanup', () => {
	test('embeds text buffers without uploading or logging their contents', async () => {
		const onProgress = vi.fn()
		await run({ files: [Buffer.from('private text')], onProgress })
		expect(mocks.generate.mock.calls[0][0].contents).toContainEqual(
			expect.stringContaining('private text')
		)
		expect(mocks.upload).not.toHaveBeenCalled()
		expect(mocks.delete).not.toHaveBeenCalled()
		expect(JSON.stringify(onProgress.mock.calls)).not.toContain('private text')
	})

	test('reads file paths through a bounded stream', async () => {
		mocks.readStream.mockReturnValue(
			Readable.from([Buffer.from('one'), Buffer.from('two')]) as ReadStream
		)
		await pieceFrontMatterFromPrompt('key', schema(), 'prompt', ['/private/path/notes.txt'])
		expect(mocks.readStream).toHaveBeenCalledWith('/private/path/notes.txt', {
			highWaterMark: 65536,
		})
		expect(mocks.generate.mock.calls[0][0].contents).toContainEqual(
			expect.stringContaining('embedding notes.txt---\nonetwo')
		)
	})

	test('uses the most recently fetched ACTIVE state, URI and MIME type', async () => {
		vi.useFakeTimers()
		binary()
		mocks.get.mockResolvedValueOnce({
			state: FileState.PROCESSING,
			uri: 'stale',
			mimeType: 'stale/type',
		})
		mocks.get.mockResolvedValueOnce({
			state: FileState.ACTIVE,
			uri: 'https://provider/latest',
			mimeType: 'image/png',
		})
		const generating = run({ files: [Buffer.from('binary')] })
		await until(() => mocks.get.mock.calls.length === 1)
		await vi.advanceTimersByTimeAsync(4999)
		expect(mocks.get).toHaveBeenCalledTimes(1)
		await vi.advanceTimersByTimeAsync(1)
		await expect(generating).resolves.toEqual({ title: 'generated' })
		expect(mocks.generate.mock.calls[0][0].contents).toContainEqual({
			fileData: { fileUri: 'https://provider/latest', mimeType: 'image/png' },
		})
		expect(GoogleGenAI).toHaveBeenCalledExactlyOnceWith({
			apiKey: 'test-key',
			httpOptions: { timeout: 300000 },
		})
		expect(mocks.upload).toHaveBeenCalledExactlyOnceWith({
			file: expect.any(Blob),
			config: { mimeType: 'application/pdf', displayName: 'luzzle-generation-input' },
		})
		const uploaded = mocks.upload.mock.calls[0][0].file as Blob
		expect(await uploaded.text()).toBe('binary')
		expect(mocks.get.mock.calls).toEqual([
			[{ name: 'files/uploaded' }],
			[{ name: 'files/uploaded' }],
		])
		expect(mocks.delete).toHaveBeenCalledExactlyOnceWith({
			name: 'files/uploaded',
			config: { httpOptions: { timeout: 10000 } },
		})
		expect(vi.getTimerCount()).toBe(0)
	})

	test.each([
		{ state: FileState.FAILED },
		{},
		{ state: FileState.ACTIVE, uri: 'missing-mime' },
		{ state: FileState.ACTIVE, mimeType: 'missing-uri' },
	])('rejects failed or incomplete processing and deletes the uploaded file: %j', async (file) => {
		binary()
		mocks.get.mockResolvedValue(file)
		await expect(run({ files: [Buffer.from('binary')] })).rejects.toThrow(
			'Attachment processing failed'
		)
		expect(mocks.generate).not.toHaveBeenCalled()
		expect(mocks.delete).toHaveBeenCalledTimes(1)
	})

	test.each([undefined, null, '', 42])(
		'rejects an invalid uploaded file name: %j',
		async (name) => {
			binary()
			mocks.upload.mockResolvedValue({ name } as Awaited<ReturnType<typeof mocks.upload>>)
			await expect(run({ files: [Buffer.from('binary')] })).rejects.toThrow(
				'Gemini file upload returned no file name.'
			)
			expect(mocks.get).not.toHaveBeenCalled()
			expect(mocks.generate).not.toHaveBeenCalled()
			expect(mocks.delete).not.toHaveBeenCalled()
		}
	)

	test.each([
		[new Error('private-key session-token private content'), 'Gemini file upload failed.'],
		[
			new ApiError({ status: 403, message: 'private-key session-token private content' }),
			'Gemini file upload failed (HTTP 403).',
		],
	])('sanitizes SDK upload failures: %s', async (error, message) => {
		binary()
		mocks.upload.mockRejectedValue(error)
		await expect(run({ files: [Buffer.from('binary')] })).rejects.toMatchObject({ message })
		expect(mocks.get).not.toHaveBeenCalled()
		expect(mocks.generate).not.toHaveBeenCalled()
		expect(mocks.delete).not.toHaveBeenCalled()
	})

	test('cleans known files when the SDK file lookup fails', async () => {
		binary()
		mocks.get.mockRejectedValue(new Error('lookup failed'))
		await expect(run({ files: [Buffer.from('binary')] })).rejects.toThrow('lookup failed')
		expect(mocks.delete).toHaveBeenCalledExactlyOnceWith({
			name: 'files/uploaded',
			config: { httpOptions: { timeout: 10000 } },
		})
		expect(mocks.generate).not.toHaveBeenCalled()
	})

	test('cleans earlier files when a later upload fails', async () => {
		binary()
		mocks.upload
			.mockResolvedValueOnce({ name: 'files/first' })
			.mockRejectedValueOnce(new Error('upload failed'))
		await expect(run({ files: [Buffer.from('one'), Buffer.from('two')] })).rejects.toThrow(
			'Gemini file upload failed.'
		)
		expect(mocks.delete).toHaveBeenCalledExactlyOnceWith({
			name: 'files/first',
			config: { httpOptions: { timeout: 10000 } },
		})
		expect(mocks.generate).not.toHaveBeenCalled()
	})

	test('cleans every known file on invalid completion', async () => {
		binary()
		mocks.upload
			.mockResolvedValueOnce({ name: 'files/first' })
			.mockResolvedValueOnce({ name: 'files/second' })
		respond('{"title":42}')
		await expect(run({ files: [Buffer.from('one'), Buffer.from('two')] })).rejects.toThrow(
			'does not match schema'
		)
		expect(mocks.delete.mock.calls.map(([arg]) => arg.name)).toEqual([
			'files/first',
			'files/second',
		])
	})

	test('cleans files if model startup fails', async () => {
		binary()
		mocks.generate.mockRejectedValue(new Error('provider unavailable'))
		await expect(run({ files: [Buffer.from('one')] })).rejects.toThrow('provider unavailable')
		expect(mocks.delete).toHaveBeenCalledTimes(1)
	})

	test('logs safe cleanup warnings without changing the valid result', async () => {
		binary()
		mocks.delete.mockRejectedValue(new Error('API key secret; private prompt'))
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		await expect(run({ files: [Buffer.from('one')] })).resolves.toEqual({
			title: 'generated',
		})
		expect(warn).toHaveBeenCalledExactlyOnceWith(
			'Could not delete a temporary generation file; provider expiry still applies.'
		)
	})

	test.each(['provider', 'validation'])(
		'logs safe cleanup warnings without masking a %s error',
		async (failure) => {
			binary()
			const providerError = new Error('provider unavailable')
			if (failure === 'provider') mocks.generate.mockRejectedValue(providerError)
			else respond('{"title":42}')
			mocks.delete.mockRejectedValue(new Error('API key secret; private prompt'))
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const generating = run({ files: [Buffer.from('one')] })
			if (failure === 'provider') await expect(generating).rejects.toBe(providerError)
			else await expect(generating).rejects.toThrow('does not match schema')
			expect(warn).toHaveBeenCalledExactlyOnceWith(
				'Could not delete a temporary generation file; provider expiry still applies.'
			)
		}
	)

	test('does not skip cleanup of other known files after a deletion fails', async () => {
		binary()
		mocks.upload
			.mockResolvedValueOnce({ name: 'files/first' })
			.mockResolvedValueOnce({ name: 'files/second' })
		mocks.delete.mockRejectedValueOnce(new Error('cleanup failed'))
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		await expect(run({ files: [Buffer.from('one'), Buffer.from('two')] })).resolves.toEqual({
			title: 'generated',
		})
		expect(mocks.delete.mock.calls.map(([arg]) => arg.name)).toEqual([
			'files/first',
			'files/second',
		])
		expect(warn).toHaveBeenCalledExactlyOnceWith(
			'Could not delete a temporary generation file; provider expiry still applies.'
		)
	})
})

describe('input and output bounds', () => {
	test('accepts the file count boundary and rejects excess files before provider work', async () => {
		const files = Array.from({ length: DEFAULT_GENERATION_LIMITS.maxFiles }, () => Buffer.from('1'))
		await expect(run({ files: [...files, Buffer.from('2')] })).rejects.toThrow('Too many')
		expect(GoogleGenAI).not.toHaveBeenCalled()
		await expect(run({ files })).resolves.toEqual({ title: 'generated' })
	})

	test('rejects invalid schema or unknown field before provider work', async () => {
		await expect(
			generateFieldValue('key', { schema: schema(), key: 'missing', source: '' })
		).rejects.toThrow('top-level property')
		const invalid = schema()
		invalid.properties.title = { type: 'string', format: 'unknown' }
		await expect(generatePieceMetadata('key', invalid, '')).rejects.toThrow('unknown format')
		expect(GoogleGenAI).not.toHaveBeenCalled()
	})

	test('bounds buffers and combined input bytes before starting further uploads', async () => {
		Object.assign(DEFAULT_GENERATION_LIMITS, { maxFileBytes: 2, maxTotalFileBytes: 3 })
		await expect(run({ files: [Buffer.from('123')] })).rejects.toThrow('byte limit')
		await expect(run({ files: [Buffer.from('12'), Buffer.from('34')] })).rejects.toThrow(
			'byte limit'
		)
		expect(mocks.upload).not.toHaveBeenCalled()
		expect(mocks.generate).not.toHaveBeenCalled()
		await expect(run({ files: [Buffer.from('12'), Buffer.from('3')] })).resolves.toEqual({
			title: 'generated',
		})
	})

	test('cleans earlier uploads when a later attachment exceeds the total byte budget', async () => {
		Object.assign(DEFAULT_GENERATION_LIMITS, { maxFileBytes: 2, maxTotalFileBytes: 3 })
		binary()
		await expect(run({ files: [Buffer.from('12'), Buffer.from('34')] })).rejects.toThrow(
			'byte limit'
		)
		expect(mocks.upload).toHaveBeenCalledOnce()
		expect(mocks.delete).toHaveBeenCalledOnce()
		expect(mocks.generate).not.toHaveBeenCalled()
	})

	test('stops reading an oversized path rather than buffering the entire file', async () => {
		Object.assign(DEFAULT_GENERATION_LIMITS, { maxFileBytes: 3 })
		const stream = Readable.from([Buffer.from('12'), Buffer.from('34'), Buffer.from('56')])
		mocks.readStream.mockReturnValue(stream as ReadStream)
		await expect(run({ files: ['/file'] })).rejects.toThrow('byte limit')
		expect(stream.destroyed).toBe(true)
		expect(mocks.fileType).not.toHaveBeenCalled()
	})

	test('checks the final UTF-8 output byte limit, including its exact boundary', async () => {
		const text = '{"title":"🧩"}'
		respond(text)
		const bytes = Buffer.byteLength(text, 'utf8')
		Object.assign(DEFAULT_GENERATION_LIMITS, { maxOutputBytes: bytes })
		await expect(run()).resolves.toEqual({ title: '🧩' })
		Object.assign(DEFAULT_GENERATION_LIMITS, { maxOutputBytes: bytes - 1 })
		await expect(run()).rejects.toThrow('output exceeds')
	})
})

describe('disconnected progress observers', () => {
	test.each(['throw', 'reject', 'pending'])(
		'finishes validation and cleanup when the progress sink disconnects (%s)',
		async (failure) => {
			binary()
			mocks.delete.mockRejectedValue(new Error('API key secret; private prompt'))
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const pending = deferred<GenerateContentResponse>()
			mocks.generate.mockReturnValue(pending.promise)
			let disconnected = false
			const onProgress = vi.fn<NonNullable<GenerationOptions['onProgress']>>(() => {
				if (!disconnected) return
				if (failure === 'throw') throw new Error('sink disconnected')
				if (failure === 'reject') return Promise.reject(new Error('sink disconnected'))
				return new Promise<void>(() => {})
			})
			const generating = run({ files: [Buffer.from('one')], onProgress })
			await until(() => mocks.generate.mock.calls.length === 1)
			disconnected = true
			pending.resolve(response('{"title":"finished"}'))
			await expect(generating).resolves.toEqual({ title: 'finished' })
			expect(onProgress.mock.calls.map(([event]) => event.phase)).toContain('validation')
			expect(mocks.delete).toHaveBeenCalledOnce()
			expect(warn).toHaveBeenCalledExactlyOnceWith(
				'Could not delete a temporary generation file; provider expiry still applies.'
			)
		}
	)

	test.each(['throw', 'reject', 'pending'])(
		'never blocks provider work on an unavailable progress sink (%s)',
		async (failure) => {
			const onProgress = vi.fn(() => {
				if (failure === 'throw') throw new Error('sink disconnected')
				if (failure === 'reject') return Promise.reject(new Error('sink disconnected'))
				return new Promise<void>(() => {})
			})
			await expect(run({ onProgress })).resolves.toEqual({ title: 'generated' })
			expect(mocks.generate).toHaveBeenCalledOnce()
			expect(onProgress.mock.calls).toHaveLength(3)
		}
	)

	test.each(['provider', 'validation'])(
		'preserves a %s error after disconnect and still cleans known files',
		async (failure) => {
			binary()
			mocks.delete.mockRejectedValue(new Error('API key secret; private prompt'))
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const pending = deferred<GenerateContentResponse>()
			mocks.generate.mockReturnValue(pending.promise)
			let disconnected = false
			const onProgress = vi.fn(() => {
				if (disconnected) return Promise.reject(new Error('sink disconnected'))
				return undefined
			})
			const generating = run({ files: [Buffer.from('one')], onProgress })
			const rejected = expect(generating).rejects.toThrow(
				failure === 'provider' ? 'provider failed' : 'does not match schema'
			)
			await until(() => mocks.generate.mock.calls.length === 1)
			disconnected = true
			if (failure === 'provider') pending.reject(new Error('provider failed'))
			else pending.resolve(response('{"title":42}'))
			await rejected
			expect(mocks.delete).toHaveBeenCalledOnce()
			expect(warn).toHaveBeenCalledExactlyOnceWith(
				'Could not delete a temporary generation file; provider expiry still applies.'
			)
		}
	)
})

describe('bounded file processing polling', () => {
	test.each([
		{ maxFileProcessingMs: 1, polls: 1 },
		{ maxFileProcessingMs: 5000, polls: 1 },
		{ maxFileProcessingMs: 6000, polls: 2 },
		{ maxFileProcessingMs: DEFAULT_GENERATION_LIMITS.maxFileProcessingMs, polls: 60 },
	])(
		'stops polling at the wait limit: $maxFileProcessingMs ms',
		async ({ maxFileProcessingMs, polls }) => {
			vi.useFakeTimers()
			binary()
			mocks.get.mockResolvedValue({ state: FileState.PROCESSING })
			Object.assign(DEFAULT_GENERATION_LIMITS, { maxFileProcessingMs })
			const generating = run({ files: [Buffer.from('one')] })
			const rejected = expect(generating).rejects.toThrow(
				'Attachment processing exceeded the wait limit.'
			)
			await until(() => mocks.get.mock.calls.length === 1)
			await vi.advanceTimersByTimeAsync(maxFileProcessingMs)
			await rejected
			expect(mocks.get).toHaveBeenCalledTimes(polls)
			expect(mocks.generate).not.toHaveBeenCalled()
			expect(mocks.delete).toHaveBeenCalledOnce()
			expect(vi.getTimerCount()).toBe(0)
			await vi.advanceTimersByTimeAsync(5000)
			expect(mocks.get).toHaveBeenCalledTimes(polls)
		}
	)

	test.each([FileState.ACTIVE, FileState.PROCESSING])(
		'lets an in-flight lookup finish beyond the polling budget: %s',
		async (state) => {
			vi.useFakeTimers()
			binary()
			const pending = deferred<Awaited<ReturnType<typeof mocks.get>>>()
			mocks.get.mockReturnValue(pending.promise)
			const settled = vi.fn()
			const generating = run({ files: [Buffer.from('one')] })
			void generating.then(settled, settled)
			await until(() => mocks.get.mock.calls.length === 1)
			await vi.advanceTimersByTimeAsync(DEFAULT_GENERATION_LIMITS.maxFileProcessingMs + 1)
			expect(settled).not.toHaveBeenCalled()
			pending.resolve({ state, uri: 'https://provider/ready', mimeType: 'application/pdf' })
			if (state === FileState.ACTIVE) {
				await expect(generating).resolves.toEqual({ title: 'generated' })
			} else {
				await expect(generating).rejects.toThrow('Attachment processing exceeded the wait limit.')
				expect(mocks.generate).not.toHaveBeenCalled()
			}
			expect(mocks.get).toHaveBeenCalledExactlyOnceWith({ name: 'files/uploaded' })
			expect(mocks.delete).toHaveBeenCalledOnce()
			expect(vi.getTimerCount()).toBe(0)
		}
	)
})

describe('API key validation', () => {
	test('uses the existing five-minute HTTP timeout and lists models', async () => {
		await expect(validateApiKey('key')).resolves.toEqual({ ok: true })
		expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'key', httpOptions: { timeout: 300000 } })
	})
	test.each([new Error('invalid key'), 'request failed'])(
		'returns readable failure for %s',
		async (error) => {
			mocks.list.mockRejectedValue(error)
			await expect(validateApiKey('key')).resolves.toEqual({
				ok: false,
				reason: error instanceof Error ? error.message : error,
			})
		}
	)
})
