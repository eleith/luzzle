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

		vi.doMock('vscode-ws-jsonrpc/server', () => ({
			toSocket: vi.fn((ws) => ws),
			launch: vi.fn(),
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
		const { launch } = await import('vscode-ws-jsonrpc/server')

		const ws = new WebSocket(`${wsUrl}/lsp?token=test-token`)

		await new Promise((resolve) => {
			ws.on('open', resolve)
		})

		expect(ws.readyState).toBe(WebSocket.OPEN)
		expect(launch).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				serverName: 'luzzle-lsp',
				command: 'luzzle-lsp',
				args: ['--stdio'],
				options: {
					env: expect.objectContaining({
						LUZZLE_LSP_ROOT: '/tmp/test-archive',
					}),
				},
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
