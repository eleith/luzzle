import { describe, it, expect, vi } from 'vitest'
import type { RequestMessage, NotificationMessage, ResponseMessage } from 'vscode-jsonrpc/node.js'
import {
	createContext,
	handleInitialize,
	handleDidOpen,
	handleDidChange,
	handleInitializeResponse,
	buildConfigurationResponse,
} from './handlers.js'
import type { DiscoverSchemasFn } from './handlers.js'

function makeRequest(method: string, params: Record<string, unknown>, id: number = 1): RequestMessage {
	return { jsonrpc: '2.0', id, method, params }
}

function makeNotification(method: string, params: Record<string, unknown>): NotificationMessage {
	return { jsonrpc: '2.0', method, params }
}

function makeResponse(id: number, result: Record<string, unknown>): ResponseMessage {
	return { jsonrpc: '2.0', id, result }
}

const emptyDiscover: DiscoverSchemasFn = () => ({ mapping: {}, tempDir: null })

const stubbedDiscover: DiscoverSchemasFn = () => ({
	mapping: {
		'file:///tmp/schemas/books.json': ['*.books.md'],
		'file:///tmp/schemas/films.json': ['*.films.md'],
	},
	tempDir: '/tmp/luzzle-lsp-schemas-abc123',
})

describe('createContext', () => {
	it('returns fresh state', () => {
		const ctx = createContext()

		expect(ctx.schemaMapping).toEqual({})
		expect(ctx.initializeRequestId).toBeNull()
	})
})

describe('handleInitialize', () => {
	it('injects schema mappings into initializationOptions', () => {
		const ctx = createContext()
		const msg = makeRequest('initialize', {
			rootUri: 'file:///home/user/archive',
		})

		const result = handleInitialize(msg, ctx, stubbedDiscover)
		const params = result.params as Record<string, unknown>
		const initOpts = params['initializationOptions'] as Record<string, unknown>
		const settings = initOpts['settings'] as Record<string, unknown>
		const yaml = settings['yaml'] as Record<string, unknown>

		expect(yaml['schemas']).toEqual({
			'file:///tmp/schemas/books.json': ['*.books.md'],
			'file:///tmp/schemas/films.json': ['*.films.md'],
		})
		expect(yaml['validate']).toBe(true)
		expect(yaml['completion']).toBe(true)
		expect(yaml['hover']).toBe(true)
	})

	it('updates context with schema mapping and temp dir', () => {
		const ctx = createContext()
		const msg = makeRequest('initialize', {
			rootUri: 'file:///home/user/archive',
		})

		handleInitialize(msg, ctx, stubbedDiscover)

		expect(Object.keys(ctx.schemaMapping)).toHaveLength(2)
	})

	it('sets initializeRequestId on context', () => {
		const ctx = createContext()
		const msg = makeRequest('initialize', { rootUri: 'file:///archive' }, 42)

		handleInitialize(msg, ctx, stubbedDiscover)

		expect(ctx.initializeRequestId).toBe(42)
	})

	it('preserves existing initializationOptions', () => {
		const ctx = createContext()
		const msg = makeRequest('initialize', {
			rootUri: 'file:///archive',
			initializationOptions: { existingKey: 'preserved' },
		})

		const result = handleInitialize(msg, ctx, emptyDiscover)
		const params = result.params as Record<string, unknown>
		const initOpts = params['initializationOptions'] as Record<string, unknown>

		expect(initOpts['existingKey']).toBe('preserved')
	})

	it('merges with existing yaml settings instead of clobbering', () => {
		const ctx = createContext()
		const msg = makeRequest('initialize', {
			rootUri: 'file:///archive',
			initializationOptions: {
				settings: {
					yaml: { customSchemas: { 'file:///other.json': ['*.other.md'] } },
					editor: { tabSize: 2 },
				},
			},
		})

		const result = handleInitialize(msg, ctx, emptyDiscover)
		const params = result.params as Record<string, unknown>
		const initOpts = params['initializationOptions'] as Record<string, unknown>
		const settings = initOpts['settings'] as Record<string, unknown>
		const yaml = settings['yaml'] as Record<string, unknown>

		expect(yaml['customSchemas']).toEqual({ 'file:///other.json': ['*.other.md'] })
		expect(yaml['validate']).toBe(true)
		expect(settings['editor']).toEqual({ tabSize: 2 })
	})

	it('handles missing rootUri gracefully', () => {
		const ctx = createContext()
		const msg = makeRequest('initialize', {})

		const result = handleInitialize(msg, ctx, stubbedDiscover)
		const params = result.params as Record<string, unknown>
		const initOpts = params['initializationOptions'] as Record<string, unknown>
		const settings = initOpts['settings'] as Record<string, unknown>
		const yaml = settings['yaml'] as Record<string, unknown>

		expect(yaml['schemas']).toEqual({})
	})

	it('uses LUZZLE_LSP_ROOT env var over client rootUri', () => {
		vi.stubEnv('LUZZLE_LSP_ROOT', '/app/archive')

		const ctx = createContext()
		const discover: DiscoverSchemasFn = (rootUri) => {
			expect(rootUri).toBe('file:///app/archive')
			return { mapping: { 'file:///app/archive/.luzzle/schemas/books.json': ['*.books.md'] }, tempDir: null }
		}
		const msg = makeRequest('initialize', {
			rootUri: 'file:///home/user/archive',
		})

		const result = handleInitialize(msg, ctx, discover)
		const params = result.params as Record<string, unknown>
		const initOpts = params['initializationOptions'] as Record<string, unknown>
		const settings = initOpts['settings'] as Record<string, unknown>
		const yaml = settings['yaml'] as Record<string, unknown>

		expect(yaml['schemas']).toEqual({ 'file:///app/archive/.luzzle/schemas/books.json': ['*.books.md'] })

		vi.unstubAllEnvs()
	})

	it('uses LUZZLE_LSP_ROOT even when client sends no rootUri', () => {
		vi.stubEnv('LUZZLE_LSP_ROOT', '/app/archive')

		const ctx = createContext()
		const discover: DiscoverSchemasFn = (rootUri) => {
			expect(rootUri).toBe('file:///app/archive')
			return { mapping: {}, tempDir: null }
		}
		const msg = makeRequest('initialize', {})

		handleInitialize(msg, ctx, discover)

		vi.unstubAllEnvs()
	})
})

describe('handleDidOpen', () => {
	it('masks the document body', () => {
		const msg = makeNotification('textDocument/didOpen', {
			textDocument: {
				uri: 'file:///archive/debt.books.md',
				languageId: 'markdown',
				version: 1,
				text: '---\ntitle: Debt\n---\nSome body text',
			},
		})

		const result = handleDidOpen(msg)
		const params = result.params as Record<string, unknown>
		const doc = params['textDocument'] as Record<string, unknown>

		expect(doc['text']).toBe('---\ntitle: Debt\n...\n              ')
	})

	it('rewrites languageId to yaml', () => {
		const msg = makeNotification('textDocument/didOpen', {
			textDocument: {
				uri: 'file:///archive/debt.books.md',
				languageId: 'markdown',
				version: 1,
				text: '---\ntitle: Test\n---\n',
			},
		})

		const result = handleDidOpen(msg)
		const params = result.params as Record<string, unknown>
		const doc = params['textDocument'] as Record<string, unknown>

		expect(doc['languageId']).toBe('yaml')
	})

	it('masks entire document when no frontmatter', () => {
		const msg = makeNotification('textDocument/didOpen', {
			textDocument: {
				uri: 'file:///some/file.md',
				languageId: 'markdown',
				version: 1,
				text: 'Just plain markdown',
			},
		})

		const result = handleDidOpen(msg)
		const params = result.params as Record<string, unknown>
		const doc = params['textDocument'] as Record<string, unknown>

		expect(doc['text']).toBe('                   ')
	})

	it('preserves uri and version fields', () => {
		const msg = makeNotification('textDocument/didOpen', {
			textDocument: {
				uri: 'file:///archive/debt.books.md',
				languageId: 'markdown',
				version: 7,
				text: '---\ntitle: Test\n---\n',
			},
		})

		const result = handleDidOpen(msg)
		const params = result.params as Record<string, unknown>
		const doc = params['textDocument'] as Record<string, unknown>

		expect(doc['uri']).toBe('file:///archive/debt.books.md')
		expect(doc['version']).toBe(7)
	})
})

describe('handleDidChange', () => {
	it('masks text in full content changes', () => {
		const msg = makeNotification('textDocument/didChange', {
			textDocument: { uri: 'file:///archive/debt.books.md', version: 2 },
			contentChanges: [
				{ text: '---\ntitle: Updated\n---\nNew body content' },
			],
		})

		const result = handleDidChange(msg)
		const params = result.params as Record<string, unknown>
		const changes = params['contentChanges'] as Array<Record<string, unknown>>

		expect(changes[0]['text']).toBe('---\ntitle: Updated\n...\n                ')
	})

	it('handles multiple content changes', () => {
		const msg = makeNotification('textDocument/didChange', {
			textDocument: { uri: 'file:///file.md', version: 3 },
			contentChanges: [
				{ text: '---\na: 1\n---\nbody one' },
				{ text: '---\nb: 2\n---\nbody two' },
			],
		})

		const result = handleDidChange(msg)
		const params = result.params as Record<string, unknown>
		const changes = params['contentChanges'] as Array<Record<string, unknown>>

		expect(changes).toHaveLength(2)
		expect(changes[0]['text']).toBe('---\na: 1\n...\n        ')
		expect(changes[1]['text']).toBe('---\nb: 2\n...\n        ')
	})

	it('passes through changes without text field', () => {
		const msg = makeNotification('textDocument/didChange', {
			textDocument: { uri: 'file:///file.md', version: 2 },
			contentChanges: [{ range: {}, rangeLength: 0 }],
		})

		const result = handleDidChange(msg)
		const params = result.params as Record<string, unknown>
		const changes = params['contentChanges'] as Array<Record<string, unknown>>

		expect(changes[0]).toEqual({ range: {}, rangeLength: 0 })
	})
})

describe('handleInitializeResponse', () => {
	it('forces full document sync on existing textDocumentSync object', () => {
		const msg = makeResponse(1, {
			capabilities: {
				textDocumentSync: { openClose: true, change: 2, save: true },
			},
		})

		const result = handleInitializeResponse(msg)
		const res = result.result as Record<string, unknown>
		const caps = res['capabilities'] as Record<string, unknown>
		const sync = caps['textDocumentSync'] as Record<string, unknown>

		expect(sync['change']).toBe(1)
		expect(sync['openClose']).toBe(true)
		expect(sync['save']).toBe(true)
	})

	it('creates textDocumentSync when it is a number', () => {
		const msg = makeResponse(1, {
			capabilities: {
				textDocumentSync: 2,
			},
		})

		const result = handleInitializeResponse(msg)
		const res = result.result as Record<string, unknown>
		const caps = res['capabilities'] as Record<string, unknown>
		const sync = caps['textDocumentSync'] as Record<string, unknown>

		expect(sync['change']).toBe(1)
		expect(sync['openClose']).toBe(true)
	})

	it('passes through response with no result', () => {
		const msg: ResponseMessage = { jsonrpc: '2.0', id: 1, error: { code: -1, message: 'fail' } }

		const result = handleInitializeResponse(msg)

		expect(result).toEqual(msg)
	})
})

describe('buildConfigurationResponse', () => {
	it('responds with schema mapping for yaml section', () => {
		const ctx = createContext()
		ctx.schemaMapping = { 'file:///tmp/books.json': ['*.books.md'] }

		const msg = makeRequest('workspace/configuration', {
			items: [{ section: 'yaml' }],
		})

		const result = buildConfigurationResponse(msg, ctx)
		const items = result.result as Array<Record<string, unknown>>

		expect(items).toHaveLength(1)
		expect(items[0]['schemas']).toEqual({ 'file:///tmp/books.json': ['*.books.md'] })
		expect(items[0]['validate']).toBe(true)
	})

	it('responds with null for non-yaml sections', () => {
		const ctx = createContext()

		const msg = makeRequest('workspace/configuration', {
			items: [{ section: 'editor' }, { section: 'yaml' }],
		})

		const result = buildConfigurationResponse(msg, ctx)
		const items = result.result as Array<unknown>

		expect(items[0]).toBeNull()
		expect(items[1]).not.toBeNull()
	})

	it('preserves the request id in the response', () => {
		const ctx = createContext()
		const msg = makeRequest('workspace/configuration', { items: [] }, 99)

		const result = buildConfigurationResponse(msg, ctx)

		expect(result.id).toBe(99)
	})
})

describe('Edge Cases (Missing params/fields)', () => {
	it('handleInitialize gracefully handles missing params', () => {
		const ctx = createContext()
		const msg = makeRequest('initialize', undefined as unknown as Record<string, unknown>)
		delete msg.params
		const result = handleInitialize(msg, ctx, emptyDiscover)
		expect(result.params).toBeDefined()
	})

	it('handleDidOpen gracefully handles missing params and textDocument', () => {
		const msg = makeNotification('textDocument/didOpen', undefined as unknown as Record<string, unknown>)
		delete msg.params
		const result1 = handleDidOpen(msg)
		expect((result1.params as Record<string, unknown>)['textDocument']).toBeDefined()
		expect(((result1.params as Record<string, unknown>)['textDocument'] as Record<string, unknown>)['languageId']).toBe('yaml')

		const msg2 = makeNotification('textDocument/didOpen', {})
		const result2 = handleDidOpen(msg2)
		expect(((result2.params as Record<string, unknown>)['textDocument'] as Record<string, unknown>)['languageId']).toBe('yaml')
	})

	it('handleDidChange gracefully handles missing params and contentChanges', () => {
		const msg = makeNotification('textDocument/didChange', undefined as unknown as Record<string, unknown>)
		delete msg.params
		const result1 = handleDidChange(msg)
		expect((result1.params as Record<string, unknown>)['contentChanges']).toBeUndefined()

		const msg2 = makeNotification('textDocument/didChange', {})
		const result2 = handleDidChange(msg2)
		expect((result2.params as Record<string, unknown>)['contentChanges']).toBeUndefined()
	})

	it('handleInitializeResponse gracefully handles missing capabilities', () => {
		const msg = makeResponse(1, {})
		const result = handleInitializeResponse(msg)
		const res = result.result as Record<string, unknown>
		const caps = res['capabilities'] as Record<string, unknown>
		const sync = caps['textDocumentSync'] as Record<string, unknown>
		expect(sync['change']).toBe(1)
	})

	it('buildConfigurationResponse gracefully handles missing params and items', () => {
		const ctx = createContext()
		const msg = makeRequest('workspace/configuration', undefined as unknown as Record<string, unknown>)
		delete msg.params
		const result1 = buildConfigurationResponse(msg, ctx)
		expect(result1.result).toEqual([])

		const msg2 = makeRequest('workspace/configuration', { items: [{}] })
		const result2 = buildConfigurationResponse(msg2, ctx)
		expect(result2.result).toEqual([null])
	})
})
