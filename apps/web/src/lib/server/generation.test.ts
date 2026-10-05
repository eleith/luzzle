import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
	DEFAULT_GENERATION_LIMITS,
	Piece,
	extractFullMarkdown,
	type PieceFrontmatter,
	type PieceFrontmatterSchema
} from '@luzzle/core'
import type { GenerationEvent } from '$lib/generation/types'
import { POST } from '../../routes/api/admin/generate/+server'

const fixture = vi.hoisted(() => {
	const ai = { provider: 'google' as const, api_key: 'server-secret' }
	return {
		ai,
		config: {
			ai: ai as typeof ai | undefined,
			pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date' } }]
		},
		provider: {
			client: vi.fn(),
			generate: vi.fn(),
			upload: vi.fn(),
			get: vi.fn(),
			delete: vi.fn()
		},
		storage: {
			stat: vi.fn(),
			readFile: vi.fn(),
			writeFile: vi.fn(),
			createFile: vi.fn(),
			makeDirectory: vi.fn(),
			delete: vi.fn()
		}
	}
})

vi.mock('./config', () => ({ config: fixture.config }))
vi.mock('./storage', () => ({ getStorage: () => fixture.storage }))
vi.mock('./constants', () => ({
	MAX_SOURCE_CHARS: 1000,
	MAX_INSTRUCTION_CHARS: 100,
	MAX_CONCURRENT_GENERATIONS: 1,
	HEARTBEAT_MS: 15000
}))
// Mock only the provider transport: core selection, validation, parsing and merging stay real.
vi.mock('../../../../core/node_modules/@google/genai', async (original) => ({
	...(await original<Record<string, unknown>>()),
	GoogleGenAI: vi.fn(function (options) {
		fixture.provider.client(options)
		return {
			models: { generateContent: fixture.provider.generate },
			files: {
				upload: fixture.provider.upload,
				get: fixture.provider.get,
				delete: fixture.provider.delete
			}
		}
	})
}))
vi.mock('$lib/server/database', () => {
	throw new Error('Generation must not import the database')
})
vi.mock('@luzzle/web.jobs', () => {
	throw new Error('Generation must not import durable jobs')
})

let schema: PieceFrontmatterSchema<PieceFrontmatter>
const limits = { ...DEFAULT_GENERATION_LIMITS }
const source =
	'---\ntitle: Unsaved\nbody: Metadata body\ncover: unfinished\n---\n\nActual unsaved body\n'

beforeEach(() => {
	vi.clearAllMocks()
	fixture.config.ai = fixture.ai
	fixture.config.pieces = [{ type: 'books', fields: { title: 'title', date_consumed: 'date' } }]
	Object.assign(DEFAULT_GENERATION_LIMITS, {
		maxFiles: 2,
		maxFileBytes: 50,
		maxTotalFileBytes: 75,
		maxOutputBytes: 1000
	})
	schema = {
		title: 'books',
		type: 'object',
		properties: {
			title: { type: 'string', minLength: 2 },
			body: { type: 'string' },
			cover: { type: 'string', format: 'asset' }
		},
		required: ['title'],
		additionalProperties: false
	}
	fixture.storage.readFile.mockImplementation(async (file: string) => {
		expect(file).toBe('.luzzle/schemas/books.json')
		return JSON.stringify(schema)
	})
	fixture.storage.stat.mockRejectedValue(new Error('Generation must not probe archive files'))
	fixture.provider.generate.mockResolvedValue(completion('# Generated body'))
	fixture.provider.upload.mockResolvedValue({ name: 'files/uploaded' })
	fixture.provider.get.mockResolvedValue({
		state: 'ACTIVE',
		uri: 'https://provider/uploaded',
		mimeType: 'application/pdf'
	})
	fixture.provider.delete.mockResolvedValue({})
	vi.spyOn(Piece.prototype, 'setField').mockRejectedValue(new Error('No asset downloads'))
	vi.spyOn(Piece.prototype, 'write').mockRejectedValue(new Error('No saving'))
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	Object.assign(DEFAULT_GENERATION_LIMITS, limits)
	for (const method of ['writeFile', 'createFile', 'makeDirectory', 'delete'] as const) {
		expect(fixture.storage[method]).not.toHaveBeenCalled()
	}
	expect(fixture.storage.stat).not.toHaveBeenCalled()
	expect(Piece.prototype.setField).not.toHaveBeenCalled()
	expect(Piece.prototype.write).not.toHaveBeenCalled()
	vi.restoreAllMocks()
})

function completion(text: string) {
	return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }
}

function form(keys?: string[]) {
	const data = new FormData()
	data.set('instructions', 'Find accurate details')
	data.set('file', 'books/disk.books.md')
	data.set('source', JSON.stringify(source))
	data.set('target', keys ? 'fields' : 'body')
	if (keys) data.set('fields', JSON.stringify(keys))
	return data
}

function request(data = form(), signal?: AbortSignal) {
	return new Request('http://localhost/api/admin/generate', { method: 'POST', body: data, signal })
}

function post(req = request()) {
	return POST({ request: req } as Parameters<typeof POST>[0])
}

async function events(response: Response): Promise<GenerationEvent[]> {
	return (await response.text())
		.trim()
		.split('\n\n')
		.filter((frame) => frame.startsWith('event:'))
		.map((frame) => {
			const [name, data] = frame.split('\n')
			return { type: name.slice(7), data: JSON.parse(data.slice(6)) } as GenerationEvent
		})
}

function result(frames: GenerationEvent[]) {
	const done = frames.at(-1)
	expect(done).toMatchObject({ type: 'done', data: { state: 'completed' } })
	if (done?.type !== 'done' || done.data.state !== 'completed') throw new Error('Missing result')
	return done.data.result.markdown
}

function failed(frames: GenerationEvent[]) {
	expect(frames.filter((frame) => frame.type === 'done')).toEqual([
		{ type: 'done', data: { state: 'failed' } }
	])
	expect(frames.some((frame) => frame.type === 'error')).toBe(true)
	expect(JSON.stringify(frames)).not.toContain('"markdown"')
}

test.each([{ keys: ['title'] }, { keys: ['title', 'body'] }])(
	'metadata generation merges selected fields in one operation: $keys',
	async ({ keys }) => {
		const generated = Object.fromEntries(keys.map((key) => [key, `Generated ${key}`]))
		fixture.provider.generate.mockResolvedValue(completion(JSON.stringify(generated)))
		const data = form(keys)
		data.append('files', new File(['attachment'], 'source.txt'))
		data.set('api_key', 'untrusted-browser-key')
		data.set('schema', JSON.stringify({ type: 'object' }))
		const response = await post(request(data))
		expect(response.headers.get('content-type')).toBe('text/event-stream')
		const frames = await events(response)
		expect(await extractFullMarkdown(result(frames))).toMatchObject({
			frontmatter: { title: 'Unsaved', body: 'Metadata body', cover: 'unfinished', ...generated },
			markdown: 'Actual unsaved body'
		})
		expect(fixture.provider.generate).toHaveBeenCalledTimes(1)
		const call = fixture.provider.generate.mock.calls[0][0]
		expect(call.config.responseJsonSchema.properties).toEqual(
			Object.fromEntries(keys.map((key) => [key, schema.properties[key]]))
		)
		expect(call.contents).toContain('Find accurate details')
		expect(call.contents.join('\n')).toContain(JSON.stringify(source))
		expect(call.contents.join('\n')).toContain('attachment')
		expect(fixture.provider.client).toHaveBeenCalledWith(
			expect.objectContaining({ apiKey: 'server-secret' })
		)
		expect(JSON.stringify(frames)).not.toContain('server-secret')
		const phases = frames.filter((frame) => frame.type === 'phase').at(-1)
		expect(phases?.data.map((phase) => [phase.phase, phase.status])).toEqual([
			['preparation', 'completed'],
			['generation', 'completed'],
			['validation', 'completed']
		])
		expect(fixture.storage.readFile).toHaveBeenCalledExactlyOnceWith(
			'.luzzle/schemas/books.json',
			'text'
		)
	}
)

test('nullable generated fields complete with null-free metadata without overwriting existing values or saving', async () => {
	schema.properties.title = { type: ['string', 'null'], minLength: 2 }
	schema.properties.body = { type: ['string', 'null'] }
	schema.properties.cover = { type: ['string', 'null'], format: 'asset' }
	const input =
		'---\ntitle: Unsaved\nbody: null\nexisting: null\nnested:\n  removed: null\n  values: [null, false, 0, "", "null"]\n---\n\nKeep literal null in the body.'
	fixture.provider.generate.mockResolvedValue(completion('{"title":null,"body":null,"cover":null}'))
	const data = form(['title', 'body', 'cover'])
	data.set('source', JSON.stringify(input))
	const frames = await events(await post(request(data)))
	expect(await extractFullMarkdown(result(frames))).toEqual({
		frontmatter: {
			title: 'Unsaved',
			nested: { values: [false, 0, '', 'null'] }
		},
		markdown: 'Keep literal null in the body.'
	})
	expect(fixture.provider.generate).toHaveBeenCalledTimes(1)
	for (const method of ['writeFile', 'createFile', 'makeDirectory', 'delete'] as const) {
		expect(fixture.storage[method]).not.toHaveBeenCalled()
	}
	expect(Piece.prototype.write).not.toHaveBeenCalled()
})

test('body append preserves unsaved metadata and notes without validating untouched values', async () => {
	const frames = await events(await post())
	expect(result(frames)).toBe(`${source}\n\n# Generated body`)
	expect(await extractFullMarkdown(result(frames))).toMatchObject({
		frontmatter: { title: 'Unsaved', body: 'Metadata body', cover: 'unfinished' },
		markdown: 'Actual unsaved body\n\n\n# Generated body'
	})
	const call = fixture.provider.generate.mock.calls[0][0]
	expect(call.config).not.toHaveProperty('responseJsonSchema')
	expect(call.contents.join('\n')).toContain(JSON.stringify(source))
	expect(fixture.storage.readFile).not.toHaveBeenCalled()
})

test.each([
	'',
	'---\r\n# Keep this comment\r\ntitle: "Unsaved"\r\nbody: Metadata body\r\ncover: unfinished\r\n---\r\n\r\n  Unsaved notes  \r\n'
])('body append returns a whole document retaining exact editor source: %j', async (input) => {
	const body = '\n# New notes\n\n  trailing whitespace  \r\n'
	fixture.provider.generate.mockResolvedValue(completion(body))
	const data = form()
	data.set('source', JSON.stringify(input))
	const frames = await events(await post(request(data)))
	expect(result(frames)).toBe(input ? `${input}\n\n${body}` : body)
})

test('a metadata field named body is not the Markdown body target', async () => {
	fixture.provider.generate.mockResolvedValue(completion('{"body":"Generated metadata"}'))
	const frames = await events(await post(request(form(['body']))))
	expect(await extractFullMarkdown(result(frames))).toMatchObject({
		frontmatter: { title: 'Unsaved', body: 'Generated metadata', cover: 'unfinished' },
		markdown: 'Actual unsaved body'
	})
})

test.each(['http', 'https'])(
	'generated %s assets are accepted without downloading or saving them',
	async (protocol) => {
		const cover = `${protocol}://example.test/cover.jpg`
		fixture.provider.generate.mockResolvedValue(completion(JSON.stringify({ cover })))
		const frames = await events(await post(request(form(['cover']))))
		expect(await extractFullMarkdown(result(frames))).toMatchObject({
			frontmatter: { title: 'Unsaved', cover }
		})
	}
)

test.each([
	'{"title":"Valid","cover":"cover.jpg"}',
	'{"title":"X","cover":"https://example.test/cover.jpg"}',
	'{"title":"Valid"}',
	'{"title":"Valid","cover":42}'
])('validates every selected field and never returns partial metadata: %s', async (output) => {
	fixture.provider.generate.mockResolvedValue(completion(output))
	failed(await events(await post(request(form(['title', 'cover'])))))
})

test('invalid editor YAML yields no usable merged fields document', async () => {
	const data = form(['title'])
	data.set('source', JSON.stringify('---\ntitle: [unfinished\n---\n\nUnsaved body\n'))
	fixture.provider.generate.mockResolvedValue(completion('{"title":"Generated"}'))
	failed(await events(await post(request(data))))
})

test('body append preserves even unfinished editor YAML without parsing it', async () => {
	const input = '---\ntitle: [unfinished\n---\n\nUnsaved body\n'
	const data = form()
	data.set('source', JSON.stringify(input))
	fixture.provider.generate.mockResolvedValue(completion('Generated body'))
	expect(result(await events(await post(request(data))))).toBe(`${input}\n\nGenerated body`)
})

test.each(['unknown', 'toString', '__proto__', 'constructor', 'prototype', 'title.nested'])(
	'rejects field %s before provider work',
	async (key) => {
		await expect(post(request(form(['title', key])))).rejects.toMatchObject({ status: 400 })
		expect(fixture.provider.client).not.toHaveBeenCalled()
		expect(fixture.provider.upload).not.toHaveBeenCalled()
		expect(fixture.provider.generate).not.toHaveBeenCalled()
	}
)

test.each(['books/disk.unknown.md', '.assets/disk.books.md', 'file.books.txt', 'books'])(
	'rejects an invalid metadata schema identity %s',
	async (file) => {
		const data = form(['title'])
		data.set('file', file)
		await expect(post(request(data))).rejects.toMatchObject({ status: 400 })
		expect(fixture.provider.generate).not.toHaveBeenCalled()
	}
)

test.each([null, '', 'field', 'unknown', new File(['body'], 'target.txt')])(
	'invalid target %s releases capacity before provider work',
	async (target) => {
		const data = form()
		data.delete('target')
		if (target !== null) data.set('target', target)
		await expect(post(request(data))).rejects.toMatchObject({ status: 400 })
		expect(fixture.storage.readFile).not.toHaveBeenCalled()
		expect(fixture.storage.stat).not.toHaveBeenCalled()
		expect(fixture.provider.generate).not.toHaveBeenCalled()
		result(await events(await post()))
	}
)

test('rejects a missing field schema and releases capacity', async () => {
	fixture.storage.readFile.mockRejectedValueOnce(new Error('missing schema'))
	await expect(post(request(form(['title'])))).rejects.toMatchObject({ status: 400 })
	expect(fixture.provider.generate).not.toHaveBeenCalled()
	result(await events(await post()))
})

test.each([0, -1])(
	'checks the appended document output cap at its boundary (%i bytes)',
	async (offset) => {
		const body = 'Small body'
		const markdown = `${source}\n\n${body}`
		const maxOutputBytes = Buffer.byteLength(JSON.stringify({ markdown })) + offset
		Object.assign(DEFAULT_GENERATION_LIMITS, { maxOutputBytes })
		expect(Buffer.byteLength(JSON.stringify({ markdown: source }))).toBeLessThan(maxOutputBytes)
		expect(Buffer.byteLength(body)).toBeLessThan(maxOutputBytes)
		fixture.provider.generate.mockResolvedValue(completion(body))
		const frames = await events(await post())
		if (offset === 0) expect(result(frames)).toBe(markdown)
		else failed(frames)
	}
)

test('provider failures are terminal and do not expose provider details', async () => {
	fixture.provider.generate.mockRejectedValueOnce(new Error('secret provider request details'))
	const frames = await events(await post())
	failed(frames)
	expect(JSON.stringify(frames)).not.toContain('secret provider request details')
})

test('unconfigured AI rejects without reading the body', async () => {
	fixture.config.ai = undefined
	const req = request()
	await expect(post(req)).rejects.toMatchObject({ status: 503 })
	expect(req.bodyUsed).toBe(false)
	expect(fixture.provider.generate).not.toHaveBeenCalled()
})

test('unsupported AI providers fail closed before consuming input or using Google', async () => {
	fixture.config.ai = { ...fixture.ai }
	// Deliberately bypass the validated config boundary to exercise provider dispatch.
	Object.defineProperty(fixture.config.ai, 'provider', { value: 'unsupported' })
	const req = request()
	await expect(post(req)).rejects.toMatchObject({ status: 503 })
	expect(req.bodyUsed).toBe(false)
	expect(fixture.provider.client).not.toHaveBeenCalled()
	expect(fixture.provider.generate).not.toHaveBeenCalled()
	fixture.config.ai = fixture.ai
	result(await events(await post()))
})

test('reserves capacity before multipart parsing and releases it after malformed input', async () => {
	let stream!: ReadableStreamDefaultController<Uint8Array>
	const req = new Request('http://localhost/api/admin/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
		body: new ReadableStream({
			start(value) {
				stream = value
			}
		}),
		duplex: 'half'
	} as RequestInit)
	const pending = post(req)
	const rejected = request()
	await expect(post(rejected)).rejects.toMatchObject({ status: 429 })
	expect(rejected.bodyUsed).toBe(false)
	stream.error(new Error('Incomplete upload'))
	await expect(pending).rejects.toThrow('Incomplete upload')
	expect(fixture.provider.generate).not.toHaveBeenCalled()
	result(await events(await post()))
})

test.each(['cancel', 'abort', 'detached failure'] as const)(
	'keeps the slot through provider cleanup after %s',
	async (disconnect) => {
		let settle!: (value: ReturnType<typeof completion>) => void
		let fail!: (cause: Error) => void
		let cleanup!: () => void
		fixture.provider.generate.mockImplementationOnce(
			() =>
				new Promise((resolve, reject) => {
					settle = resolve
					fail = reject
				})
		)
		fixture.provider.delete.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					cleanup = resolve
				})
		)
		const data = form()
		data.append('files', new File(['%PDF-1.7\nreference'], 'reference.pdf'))
		const abort = new AbortController()
		const response = await post(request(data, abort.signal))
		await vi.waitFor(() => expect(fixture.provider.generate).toHaveBeenCalledTimes(1))
		if (disconnect === 'abort') abort.abort()
		else await response.body!.cancel()
		await expect(post()).rejects.toMatchObject({ status: 429 })
		if (disconnect === 'detached failure') fail(new Error('provider failed after disconnect'))
		else settle(completion('Abandoned result'))
		await vi.waitFor(() => expect(fixture.provider.delete).toHaveBeenCalledTimes(1))
		await expect(post()).rejects.toMatchObject({ status: 429 })
		cleanup()
		await vi.waitFor(async () => {
			result(await events(await post()))
		})
	}
)

test('metadata uses the configured schema without requiring a persisted piece', async () => {
	const data = form(['title'])
	data.set('file', 'not-created.books.md')
	fixture.provider.generate.mockResolvedValue(completion('{"title":"Generated"}'))
	const markdown = result(await events(await post(request(data))))
	expect((await extractFullMarkdown(markdown)).frontmatter.title).toBe('Generated')
	expect(fixture.storage.readFile).toHaveBeenCalledExactlyOnceWith(
		'.luzzle/schemas/books.json',
		'text'
	)
})

test('body generation needs neither a file identity nor an archive schema', async () => {
	fixture.config.pieces = []
	fixture.storage.readFile.mockRejectedValue(new Error('Archive unavailable'))
	const data = form()
	data.delete('file')
	expect(result(await events(await post(request(data))))).toBe(`${source}\n\n# Generated body`)
	expect(fixture.storage.readFile).not.toHaveBeenCalled()
})

test.each([null, '', '  ', new File(['path'], 'identity.txt')])(
	'metadata requires a text file identity to select its schema: %s',
	async (file) => {
		const data = form(['title'])
		data.delete('file')
		if (file !== null) data.set('file', file)
		await expect(post(request(data))).rejects.toMatchObject({ status: 400 })
		expect(fixture.storage.readFile).not.toHaveBeenCalled()
		expect(fixture.provider.client).not.toHaveBeenCalled()
		result(await events(await post()))
	}
)

test.each(['body', 'fields'] as const)(
	'%s preflight checks input and attachments before any provider work',
	async (target) => {
		const data = form(target === 'fields' ? ['title'] : undefined)
		data.append('files', new File([new Uint8Array(51)], 'oversized.bin'))
		await expect(post(request(data))).rejects.toMatchObject({ status: 413 })
		expect(fixture.provider.client).not.toHaveBeenCalled()
		expect(fixture.provider.upload).not.toHaveBeenCalled()
		expect(fixture.provider.generate).not.toHaveBeenCalled()
		result(await events(await post()))
	}
)

test('field selection validation is reported after the core promise settles', async () => {
	fixture.provider.generate.mockResolvedValue(completion('{"title":"X"}'))
	const frames = await events(await post(request(form(['title']))))
	failed(frames)
	expect(frames).toContainEqual({
		type: 'error',
		data: {
			message: expect.stringMatching(/Generated field selection.*\/title.*must NOT have fewer/)
		}
	})
	expect(console.error).toHaveBeenCalledWith(
		'AI generation failed.',
		expect.objectContaining({
			phase: 'validation',
			error: 'GenerationValidationError',
			validation: expect.stringContaining('/title')
		})
	)
	result(await events(await post()))
})

test('logs an upload failure HTTP status from its cause without exposing provider details', async () => {
	const providerError = Object.assign(new Error('private prompt and api-key=secret'), {
		status: 403
	})
	fixture.provider.upload.mockRejectedValueOnce(providerError)
	const data = form()
	data.append('files', new File(['%PDF-1.7\nreference'], 'reference.pdf'))
	const frames = await events(await post(request(data)))
	failed(frames)
	expect(console.error).toHaveBeenCalledWith(
		'AI generation failed.',
		expect.objectContaining({ phase: 'preparation', status: 403 })
	)
	expect(JSON.stringify(frames)).not.toMatch(/private prompt|api-key=secret/)
	expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
		/private prompt|api-key=secret/
	)
	expect(fixture.provider.generate).not.toHaveBeenCalled()
	result(await events(await post()))
})
