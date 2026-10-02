import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
	Piece,
	extractFullMarkdown,
	generateBody,
	generateFieldValue,
	generatePieceMetadata,
	type GenerationOptions,
	type PieceFrontmatter,
	type PieceFrontmatterSchema
} from '@luzzle/core'
import type { GenerationEvent } from '$lib/generation/types'
import { POST } from '../../routes/api/admin/generate/+server'

const fixture = vi.hoisted(() => {
	const limits = {
		maxFiles: 2,
		maxFileBytes: 50,
		maxTotalFileBytes: 75,
		maxOutputBytes: 1000,
		maxFileProcessingMs: 300000
	}
	const ai = { provider: 'google' as const, api_key: 'server-secret' }
	return {
		limits,
		ai,
		config: {
			ai: ai as typeof ai | undefined,
			pieces: [{ type: 'books', fields: { title: 'title' } }]
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
vi.mock('@luzzle/core', async (original) => ({
	...(await original<Record<string, unknown>>()),
	DEFAULT_GENERATION_LIMITS: fixture.limits,
	generatePieceMetadata: vi.fn(),
	generateFieldValue: vi.fn(),
	generateBody: vi.fn()
}))
vi.mock('$lib/server/database', () => {
	throw new Error('Generation must not import the database')
})
vi.mock('@luzzle/web.jobs', () => {
	throw new Error('Generation must not import durable jobs')
})

let schema: PieceFrontmatterSchema<PieceFrontmatter>

beforeEach(() => {
	vi.clearAllMocks()
	fixture.config.ai = fixture.ai
	fixture.limits.maxOutputBytes = 1000
	fixture.config.pieces = [{ type: 'books', fields: { title: 'title' } }]
	schema = {
		title: 'books',
		type: 'object',
		properties: {
			title: { type: 'string', minLength: 2 },
			body: { type: 'string' },
			cover: { type: 'string' }
		},
		required: ['title'],
		additionalProperties: false
	}
	fixture.storage.readFile.mockImplementation(async (file: string) => {
		expect(file).toBe('.luzzle/schemas/books.json')
		return JSON.stringify(schema)
	})
	fixture.storage.stat.mockImplementation(async (file: string) => {
		if (file === '.' || file === 'books') return { type: 'directory' }
		if (file === 'books/disk.books.md') return { type: 'file' }
		throw new Error('Not in the archive')
	})
	vi.mocked(generatePieceMetadata).mockImplementation(async (_key, _schema, _prompt, options) => {
		await options?.onProgress?.({ phase: 'generation', message: 'Generating metadata' })
		await options?.onProgress?.({ phase: 'validation', message: 'Validating metadata' })
		return { title: 'Model title', cover: 'https://invalid.example/asset.jpg' }
	})
	vi.mocked(generateFieldValue).mockResolvedValue('Generated field')
	vi.mocked(generateBody).mockResolvedValue('# Generated body')
	vi.spyOn(Piece.prototype, 'setField').mockRejectedValue(new Error('No asset downloads'))
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	fixture.limits.maxOutputBytes = 1000
	for (const method of ['writeFile', 'createFile', 'makeDirectory', 'delete'] as const) {
		expect(fixture.storage[method]).not.toHaveBeenCalled()
	}
	expect(Piece.prototype.setField).not.toHaveBeenCalled()
	vi.restoreAllMocks()
})

function form(mode: 'create' | 'edit' = 'create') {
	const data = new FormData()
	data.set('mode', mode)
	data.set('instructions', 'Find accurate details')
	if (mode === 'create') {
		data.set('name', 'Entered title')
		data.set('type', 'books')
		data.set('directory', 'books')
	} else {
		data.set('file', 'books/disk.books.md')
		data.set('source', JSON.stringify('---\ntitle: Unsaved\n---\n\nActual unsaved body\n'))
		data.set('target', 'body')
	}
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

function noProviderCalls() {
	expect(generatePieceMetadata).not.toHaveBeenCalled()
	expect(generateFieldValue).not.toHaveBeenCalled()
	expect(generateBody).not.toHaveBeenCalled()
}

test('creation returns validated metadata with the entered title and an empty body, without writes', async () => {
	const data = form()
	data.append('files', new File(['attachment'], 'source.txt'))
	data.set('api_key', 'untrusted-browser-key')
	data.set('schema', JSON.stringify({ type: 'object' }))
	const response = await post(request(data))
	expect(response.headers.get('content-type')).toBe('text/event-stream')
	const frames = await events(response)
	const done = frames.at(-1)
	expect(done).toMatchObject({ type: 'done', data: { state: 'completed' } })
	if (done?.type !== 'done' || done.data.state !== 'completed') throw new Error('Missing result')
	const result = done.data.result
	if (result.kind !== 'creation') throw new Error('Wrong result')
	expect(await extractFullMarkdown(result.markdown)).toMatchObject({
		frontmatter: { title: 'Entered title', cover: 'https://invalid.example/asset.jpg' },
		markdown: ''
	})
	expect(generatePieceMetadata).toHaveBeenCalledWith(
		'server-secret',
		schema,
		expect.stringContaining('Entered title: "Entered title"'),
		{
			files: [Buffer.from('attachment')],
			onProgress: expect.any(Function)
		}
	)
	expect(JSON.stringify(frames)).not.toContain('server-secret')
	// No examples/defaults are needed: creation does not initialize a placeholder piece.
	expect(schema.properties.title).not.toHaveProperty('examples')
})

test('body generation receives the raw unsaved source, never disk content', async () => {
	const data = form('edit')
	const frames = await events(await post(request(data)))
	expect(generateBody).toHaveBeenCalledWith(
		'server-secret',
		{ source: JSON.parse(data.get('source') as string), instructions: data.get('instructions') },
		{ files: [], onProgress: expect.any(Function) }
	)
	expect(frames.at(-1)).toEqual({
		type: 'done',
		data: { state: 'completed', result: { kind: 'body', value: '# Generated body' } }
	})
	expect(fixture.storage.readFile).toHaveBeenCalledTimes(1)
})

test('a metadata field named body is not the Markdown body target', async () => {
	const data = form('edit')
	data.set('target', 'field')
	data.set('key', 'body')
	const frames = await events(await post(request(data)))
	expect(generateBody).not.toHaveBeenCalled()
	expect(generateFieldValue).toHaveBeenCalledWith(
		'server-secret',
		{
			key: 'body',
			schema,
			source: JSON.parse(data.get('source') as string),
			instructions: data.get('instructions')
		},
		{ files: [], onProgress: expect.any(Function) }
	)
	expect(frames.at(-1)).toMatchObject({
		type: 'done',
		data: { result: { kind: 'field', key: 'body', value: 'Generated field' } }
	})
})

test.each([null, '', 'delete', new File(['create'], 'mode.txt')])(
	'rejects invalid mode %s before choosing a generator and releases capacity',
	async (mode) => {
		const data = form()
		if (mode === null) data.delete('mode')
		else data.set('mode', mode)
		await expect(post(request(data))).rejects.toMatchObject({ status: 400 })
		expect(fixture.storage.readFile).not.toHaveBeenCalled()
		expect(fixture.storage.stat).not.toHaveBeenCalled()
		noProviderCalls()
		expect((await events(await post())).at(-1)).toMatchObject({ data: { state: 'completed' } })
	}
)

test.each(['unknown', 'toString', '__proto__', 'title.nested'])(
	'rejects field %s before provider work',
	async (key) => {
		const data = form('edit')
		data.set('target', 'field')
		data.set('key', key)
		await expect(post(request(data))).rejects.toMatchObject({ status: 400 })
		noProviderCalls()
	}
)

test.each([
	'missing.books.md',
	'../outside.books.md',
	'books/disk.unknown.md',
	'assets/disk.books.md',
	'file.books.txt'
])('rejects invalid existing identity %s', async (file) => {
	const data = form('edit')
	data.set('file', file)
	await expect(post(request(data))).rejects.toMatchObject({ status: 400 })
	noProviderCalls()
})

test.each([
	['type', 'unknown'],
	['directory', '../outside'],
	['directory', 'books/disk.books.md']
])('rejects bad creation %s', async (field, value) => {
	const data = form()
	data.set(field, value)
	await expect(post(request(data))).rejects.toMatchObject({ status: 400 })
	noProviderCalls()
})

test('rejects a missing schema and releases capacity', async () => {
	fixture.storage.readFile.mockRejectedValueOnce(new Error('missing schema'))
	await expect(post()).rejects.toMatchObject({ status: 400 })
	noProviderCalls()
	expect((await events(await post())).at(-1)).toMatchObject({ data: { state: 'completed' } })
})

test.each(['missing', '__proto__.title'])(
	'rejects unsupported title configuration %s',
	async (title) => {
		fixture.config.pieces[0].fields.title = title
		await expect(post()).rejects.toMatchObject({ status: 400 })
		noProviderCalls()
	}
)

test('supports a configured nested title without asset-setting operations', async () => {
	schema = {
		title: 'books',
		type: 'object',
		properties: {
			details: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
		},
		required: ['details']
	}
	fixture.config.pieces[0].fields.title = 'details.name'
	vi.mocked(generatePieceMetadata).mockResolvedValue({ details: { name: 'Model name' } })
	const frames = await events(await post())
	expect(JSON.stringify(frames.at(-1))).toContain('Entered title')
	expect(JSON.stringify(frames.at(-1))).not.toContain('Model name')
})

test('revalidates the entered title against the completed metadata', async () => {
	const data = form()
	data.set('name', 'X') // Too short for the schema.
	const frames = await events(await post(request(data)))
	expect(frames.at(-1)).toEqual({ type: 'done', data: { state: 'failed' } })
	expect(frames.some((frame) => frame.type === 'error')).toBe(true)
	expect(JSON.stringify(frames)).not.toContain('cover')
})

test('caps the final serialized result as well as the core completion', async () => {
	fixture.limits.maxOutputBytes = 10
	const frames = await events(await post())
	expect(frames.at(-1)).toEqual({ type: 'done', data: { state: 'failed' } })
})

test('invalid core completions are terminal failures, never partial results', async () => {
	vi.mocked(generateFieldValue).mockImplementation(async (_key, _request, options) => {
		await options?.onProgress?.({ phase: 'validation', message: 'Validating generated field' })
		throw new Error('Generated field is invalid; secret provider request details')
	})
	const data = form('edit')
	data.set('target', 'field')
	data.set('key', 'title')
	const frames = await events(await post(request(data)))
	expect(frames.filter((event) => event.type === 'done')).toEqual([
		{ type: 'done', data: { state: 'failed' } }
	])
	expect(JSON.stringify(frames)).not.toContain('secret provider request details')
})

test('unconfigured AI rejects without reading the body', async () => {
	fixture.config.ai = undefined
	const req = request()
	await expect(post(req)).rejects.toMatchObject({ status: 503 })
	expect(req.bodyUsed).toBe(false)
	noProviderCalls()
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
	noProviderCalls()
	expect((await events(await post())).at(-1)).toMatchObject({ data: { state: 'completed' } })
})

test.each(['cancel', 'abort', 'detached failure'] as const)(
	'keeps the slot through provider cleanup after %s',
	async (disconnect) => {
		let settle!: (value: string) => void
		let fail!: (cause: Error) => void
		let received: GenerationOptions | undefined
		vi.mocked(generateBody).mockImplementationOnce(async (_key, _context, options) => {
			received = options
			return new Promise<string>((resolve, reject) => {
				settle = resolve
				fail = reject
			})
		})
		const abort = new AbortController()
		const response = await post(request(form('edit'), abort.signal))
		if (disconnect === 'abort') abort.abort()
		else await response.body!.cancel()
		await received?.onProgress?.({ phase: 'generation', message: 'Still working' })
		await expect(post()).rejects.toMatchObject({ status: 429 })
		// Settling this fake core promise represents generation AND provider-file cleanup finishing.
		if (disconnect === 'detached failure') fail(new Error('provider failed after disconnect'))
		else settle('Abandoned result')
		await vi.waitFor(async () => {
			expect((await events(await post())).at(-1)).toMatchObject({ data: { state: 'completed' } })
		})
	}
)
