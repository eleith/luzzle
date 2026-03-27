import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WebSocket from 'ws'

describe('LSP WebSocket Server', () => {
	let server
	let baseUrl
	let wsUrl

	beforeEach(async () => {
		vi.resetModules()

		process.env.LUZZLE_LSP_ROOT = '/tmp/test-archive'

		vi.doMock('vscode-ws-jsonrpc', () => ({
			toSocket: vi.fn((ws) => ws),
		}))

		const mockForward = vi.fn()
		const mockOnClose = vi.fn()
		vi.doMock('vscode-ws-jsonrpc/server', () => ({
			createWebSocketConnection: vi.fn(() => ({
				forward: mockForward,
				onClose: mockOnClose,
				dispose: vi.fn(),
			})),
			createServerProcess: vi.fn(() => ({
				forward: mockForward,
				onClose: mockOnClose,
				dispose: vi.fn(),
			})),
		}))

		const { createServer } = await import('./server.js')
		server = createServer()

		await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
		const address = server.address()
		baseUrl = `http://127.0.0.1:${address.port}`
		wsUrl = `ws://127.0.0.1:${address.port}`
	})

	afterEach(async () => {
		delete process.env.LUZZLE_LSP_ROOT
		if (server) {
			await new Promise((resolve) => server.close(resolve))
		}
	})

	it('should return 404 for HTTP requests', async () => {
		const res = await fetch(`${baseUrl}/lsp`, { method: 'GET' })
		expect(res.status).toBe(404)
	})

	it('should return 404 for unknown routes', async () => {
		const res = await fetch(`${baseUrl}/unknown`, { method: 'GET' })
		expect(res.status).toBe(404)
	})

	it('should reject WebSocket upgrade on wrong path', async () => {
		const ws = new WebSocket(`${wsUrl}/unknown`)

		const error = await new Promise((resolve) => {
			ws.on('error', resolve)
			ws.on('unexpected-response', (_req, res) => resolve(res))
		})

		expect(error.statusCode).toBe(404)
	})

	it('should accept WebSocket connection', async () => {
		const { createServerProcess } = await import('vscode-ws-jsonrpc/server')

		const ws = new WebSocket(`${wsUrl}/lsp`)

		await new Promise((resolve) => {
			ws.on('open', resolve)
		})

		expect(ws.readyState).toBe(WebSocket.OPEN)
		expect(createServerProcess).toHaveBeenCalledWith(
			'luzzle-lsp',
			'luzzle-lsp',
			['--stdio'],
			expect.objectContaining({
				env: expect.objectContaining({
					LUZZLE_LSP_ROOT: '/tmp/test-archive',
				}),
			})
		)

		ws.close()
		await new Promise((resolve) => ws.on('close', resolve))
	})

	it('should handle client disconnect', async () => {
		const ws = new WebSocket(`${wsUrl}/lsp`)

		await new Promise((resolve) => ws.on('open', resolve))

		ws.close()
		await new Promise((resolve) => ws.on('close', resolve))
	})
})

describe('injectRootUri', () => {
	let injectRootUri

	beforeEach(async () => {
		vi.resetModules()

		process.env.LUZZLE_LSP_ROOT = '/app/archive'

		vi.doMock('vscode-ws-jsonrpc', () => ({
			toSocket: vi.fn(),
		}))

		vi.doMock('vscode-ws-jsonrpc/server', () => ({
			createWebSocketConnection: vi.fn(),
			createServerProcess: vi.fn(),
		}))

		const mod = await import('./server.js')
		injectRootUri = mod.injectRootUri
	})

	afterEach(() => {
		delete process.env.LUZZLE_LSP_ROOT
	})

	it('injects rootUri into initialize request', () => {
		const msg = {
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: { rootUri: null, capabilities: {} },
		}

		const result = injectRootUri(msg)

		expect(result.params.rootUri).toBe('file:///app/archive')
	})

	it('passes through non-initialize messages unchanged', () => {
		const msg = {
			jsonrpc: '2.0',
			method: 'textDocument/didOpen',
			params: { textDocument: { uri: 'file:///app/archive/piece.books.md' } },
		}

		const result = injectRootUri(msg)

		expect(result).toBe(msg)
	})

	it('passes through messages without params', () => {
		const msg = { jsonrpc: '2.0', method: 'initialized' }

		const result = injectRootUri(msg)

		expect(result).toBe(msg)
	})
})
