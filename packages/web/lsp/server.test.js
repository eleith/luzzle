import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WebSocket from 'ws'

describe('LSP WebSocket Server', () => {
	let server
	let baseUrl
	let wsUrl

	beforeEach(async () => {
		vi.resetModules()

		process.env.LUZZLE_BUILD_TOKEN = 'test-token'
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
		delete process.env.LUZZLE_BUILD_TOKEN
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

	it('should reject WebSocket upgrade without token', async () => {
		const ws = new WebSocket(`${wsUrl}/lsp`)

		const error = await new Promise((resolve) => {
			ws.on('error', resolve)
			ws.on('unexpected-response', (_req, res) => resolve(res))
		})

		expect(error.statusCode).toBe(401)
	})

	it('should reject WebSocket upgrade with invalid token', async () => {
		const ws = new WebSocket(`${wsUrl}/lsp?token=wrong`)

		const error = await new Promise((resolve) => {
			ws.on('error', resolve)
			ws.on('unexpected-response', (_req, res) => resolve(res))
		})

		expect(error.statusCode).toBe(401)
	})

	it('should accept WebSocket connection with valid token', async () => {
		const { createServerProcess } = await import('vscode-ws-jsonrpc/server')

		const ws = new WebSocket(`${wsUrl}/lsp?token=test-token`)

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
		const ws = new WebSocket(`${wsUrl}/lsp?token=test-token`)

		await new Promise((resolve) => ws.on('open', resolve))

		ws.close()
		await new Promise((resolve) => ws.on('close', resolve))
	})
})

describe('URI rewriting', () => {
	let rewriteToServer
	let rewriteToClient

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
		rewriteToServer = mod.rewriteToServer
		rewriteToClient = mod.rewriteToClient
	})

	afterEach(() => {
		delete process.env.LUZZLE_LSP_ROOT
	})

	describe('rewriteToServer', () => {
		it('injects rootUri into initialize request', () => {
			const msg = {
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: { rootUri: null, capabilities: {} },
			}

			const result = rewriteToServer(msg)

			expect(result.params.rootUri).toBe('file:///app/archive')
		})

		it('prepends root URI to textDocument.uri', () => {
			const msg = {
				jsonrpc: '2.0',
				method: 'textDocument/didOpen',
				params: {
					textDocument: {
						uri: 'file:///piece.books.md',
						languageId: 'markdown',
						version: 1,
						text: '---\ntitle: Test\n---\n',
					},
				},
			}

			const result = rewriteToServer(msg)

			expect(result.params.textDocument.uri).toBe('file:///app/archive/piece.books.md')
			expect(result.params.textDocument.version).toBe(1)
		})

		it('does not rewrite URIs already under root', () => {
			const msg = {
				jsonrpc: '2.0',
				method: 'textDocument/didOpen',
				params: {
					textDocument: {
						uri: 'file:///app/archive/piece.books.md',
						version: 1,
					},
				},
			}

			const result = rewriteToServer(msg)

			expect(result.params.textDocument.uri).toBe('file:///app/archive/piece.books.md')
		})

		it('passes through messages without params', () => {
			const msg = { jsonrpc: '2.0', method: 'initialized' }

			const result = rewriteToServer(msg)

			expect(result).toEqual(msg)
		})

		it('passes through messages without textDocument', () => {
			const msg = {
				jsonrpc: '2.0',
				method: 'workspace/didChangeConfiguration',
				params: { settings: {} },
			}

			const result = rewriteToServer(msg)

			expect(result.params.settings).toEqual({})
		})
	})

	describe('rewriteToClient', () => {
		it('strips root URI from publishDiagnostics uri', () => {
			const msg = {
				jsonrpc: '2.0',
				method: 'textDocument/publishDiagnostics',
				params: {
					uri: 'file:///app/archive/piece.books.md',
					diagnostics: [{ message: 'error' }],
				},
			}

			const result = rewriteToClient(msg)

			expect(result.params.uri).toBe('file:///piece.books.md')
			expect(result.params.diagnostics).toEqual([{ message: 'error' }])
		})

		it('strips root URI from textDocument.uri', () => {
			const msg = {
				jsonrpc: '2.0',
				method: 'someNotification',
				params: {
					textDocument: {
						uri: 'file:///app/archive/piece.books.md',
					},
				},
			}

			const result = rewriteToClient(msg)

			expect(result.params.textDocument.uri).toBe('file:///piece.books.md')
		})

		it('does not rewrite URIs not under root', () => {
			const msg = {
				jsonrpc: '2.0',
				method: 'textDocument/publishDiagnostics',
				params: {
					uri: 'file:///other/piece.books.md',
					diagnostics: [],
				},
			}

			const result = rewriteToClient(msg)

			expect(result.params.uri).toBe('file:///other/piece.books.md')
		})

		it('passes through messages without params', () => {
			const msg = { jsonrpc: '2.0', method: 'initialized' }

			const result = rewriteToClient(msg)

			expect(result).toEqual(msg)
		})
	})
})
