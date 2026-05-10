import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

describe('Builder Server', () => {
	let server
	let baseUrl
	let mockSpawn
	const TEST_PORT = 0 // Random port

	beforeEach(async () => {
		vi.resetModules()

		// Setup env vars
		process.env.LUZZLE_BUILD_TOKEN = 'test-token'
		process.env.LUZZLE_BUILD_SCRIPT = '/tmp/test.sh'

		// Create mock spawn
		mockSpawn = vi.fn().mockImplementation(() => {
			const child = new EventEmitter()
			child.stdout = new EventEmitter()
			child.stderr = new EventEmitter()

			setTimeout(() => {
				child.stdout.emit('data', 'log output\n')
				child.emit('close', 0)
			}, 10)

			return child
		})

		// Import the factory
		const { createServer } = await import('./server.js')

		// Create fresh server with mock spawn
		server = createServer(mockSpawn)

		await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve))
		const address = server.address()
		baseUrl = `http://127.0.0.1:${address.port}`
	})

	afterEach(async () => {
		delete process.env.LUZZLE_BUILD_TOKEN
		delete process.env.LUZZLE_BUILD_SCRIPT
		if (server) {
			await new Promise((resolve) => server.close(resolve))
		}
	})

	const requestOptions = {
		method: 'POST',
		headers: { Connection: 'close' },
	}

	it('should return 404 for unknown routes', async () => {
		const res = await fetch(`${baseUrl}/unknown`, requestOptions)
		expect(res.status).toBe(404)
	})

	it('should return 401 without token', async () => {
		const res = await fetch(`${baseUrl}/hooks?action=build`, requestOptions)
		expect(res.status).toBe(401)
	})

	it('should return 401 with invalid token', async () => {
		const res = await fetch(`${baseUrl}/hooks?action=build&token=wrong`, requestOptions)
		expect(res.status).toBe(401)
	})

	it('should trigger build with valid token', async () => {
		const res = await fetch(`${baseUrl}/hooks?action=build&token=test-token`, requestOptions)

		expect(res.status).toBe(200)
		expect(res.headers.get('Transfer-Encoding')).toBe('chunked')

		const text = await res.text()
		expect(text).toContain('Executing: /app/scripts/build.sh')
		expect(text).toContain('log output')
		expect(text).toContain('Finished with exit code 0')

		expect(mockSpawn).toHaveBeenCalledWith('bash', ['/app/scripts/build.sh'])
	})

	it('should handle child process stderr output', async () => {
		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter()
			child.stdout = new EventEmitter()
			child.stderr = new EventEmitter()

			setTimeout(() => {
				child.stderr.emit('data', 'error log output\n')
				child.emit('close', 1)
			}, 10)

			return child
		})

		const res = await fetch(`${baseUrl}/hooks?action=build&token=test-token`, requestOptions)

		const text = await res.text()
		expect(text).toContain('error log output')
		expect(text).toContain('Run failed: Exit code 1')
	})

	it('should handle spawn error', async () => {
		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter()
			child.stdout = new EventEmitter()
			child.stderr = new EventEmitter()

			setTimeout(() => {
				child.emit('error', new Error('Failed to start'))
			}, 10)

			return child
		})

		const res = await fetch(`${baseUrl}/hooks?action=build&token=test-token`, requestOptions)

		const text = await res.text()
		expect(text).toContain('Error: Failed to start')
		expect(text).toContain('Run failed: Failed to start')

		// Verify we can build again
		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter()
			child.stdout = new EventEmitter()
			child.stderr = new EventEmitter()
			setTimeout(() => child.emit('close', 0), 10)
			return child
		})

		const res2 = await fetch(`${baseUrl}/hooks?action=build&token=test-token`, requestOptions)
		expect(res2.status).toBe(200)
	})

	it('should attach to and resume logs for concurrent requests', async () => {
		let finishBuild
		const buildFinishedPromise = new Promise((resolve) => {
			finishBuild = resolve
		})

		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter()
			child.stdout = new EventEmitter()
			child.stderr = new EventEmitter()

			setTimeout(() => {
				child.stdout.emit('data', 'initial log\n')
			}, 20)

			buildFinishedPromise.then(() => {
				child.stdout.emit('data', 'final log\n')
				child.emit('close', 0)
			})

			return child
		})

		const req1 = fetch(`${baseUrl}/hooks?action=build&token=test-token`, requestOptions)

		// Wait for initial log to be produced and stored
		await new Promise((r) => setTimeout(r, 100))

		const res2 = await fetch(`${baseUrl}/hooks?action=build&token=test-token`, requestOptions)
		expect(res2.status).toBe(200)

		// Finish build
		finishBuild()

		const [text1, text2] = await Promise.all([(await req1).text(), res2.text()])

		// Both should have full logs
		expect(text1).toContain('initial log')
		expect(text1).toContain('final log')
		expect(text2).toContain('initial log') // Resumed!
		expect(text2).toContain('final log')
	})

	it('should timeout builds exceeding LUZZLE_BUILD_TIMEOUT', async () => {
		const { createServer } = await import('./server.js')
		const timeoutServer = createServer(mockSpawn, 100)
		await new Promise((r) => timeoutServer.listen(0, '127.0.0.1', r))
		const tUrl = `http://127.0.0.1:${timeoutServer.address().port}`

		let killed = false
		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter()
			child.stdout = new EventEmitter()
			child.stderr = new EventEmitter()
			child.kill = () => {
				killed = true
				child.emit('close', 137)
			}
			return child
		})

		const res = await fetch(`${tUrl}/hooks?action=build&token=test-token`, requestOptions)
		const text = await res.text()

		expect(killed).toBe(true)
		expect(text).toContain('[TIMEOUT]')
		expect(text).toContain('Run failed: Timeout')

		await new Promise((r) => timeoutServer.close(r))
	})

	it('should trigger sync with valid token', async () => {
		const res = await fetch(`${baseUrl}/hooks?action=sync&token=test-token`, requestOptions)

		expect(res.status).toBe(200)
		const text = await res.text()
		expect(text).toContain('Executing: /app/scripts/sync.sh')
		expect(mockSpawn).toHaveBeenCalledWith('bash', ['/app/scripts/sync.sh'])
	})

	it('should return 409 if a different action is already running', async () => {
		let finishBuild
		const buildFinishedPromise = new Promise((resolve) => {
			finishBuild = resolve
		})

		mockSpawn.mockImplementation(() => {
			const child = new EventEmitter()
			child.stdout = new EventEmitter()
			child.stderr = new EventEmitter()

			setTimeout(() => {
				child.stdout.emit('data', 'initial build log\n')
			}, 20)

			buildFinishedPromise.then(() => {
				child.emit('close', 0)
			})

			return child
		})

		const req1 = fetch(`${baseUrl}/hooks?action=build&token=test-token`, requestOptions)

		// Wait for the build to start
		await new Promise((r) => setTimeout(r, 100))

		// Attempt to start a sync while build is running
		const res2 = await fetch(`${baseUrl}/hooks?action=sync&token=test-token`, requestOptions)
		expect(res2.status).toBe(409)
		const text2 = await res2.text()
		expect(text2).toBe("Conflict: A 'build' operation is already running.")

		// Finish the build
		finishBuild()
		await req1
	})

	it('should handle client write errors gracefully', async () => {
		// Reset modules to allow mocking http for this specific test
		vi.resetModules()

		const mockHttpServer = {
			listen: vi.fn(),
			on: vi.fn(),
			address: vi.fn(),
			close: vi.fn(),
		}
		const mockCreateServer = vi.fn().mockReturnValue(mockHttpServer)

		vi.doMock('http', () => ({
			createServer: mockCreateServer,
			IncomingMessage: class {},
			ServerResponse: class {},
		}))

		// Re-import to use the mocked http
		const { createServer } = await import('./server.js')

		// Create server (which uses our mock http.createServer)
		createServer(mockSpawn)

		// Get the request listener
		const requestListener = mockCreateServer.mock.calls[0][0]

		// Mock Request
		const mockReq = new EventEmitter()
		mockReq.url = '/hooks?action=build&token=test-token'
		mockReq.method = 'POST'
		mockReq.socket = { remoteAddress: '127.0.0.1' }

		// Mock Response
		const mockRes = new EventEmitter()
		mockRes.writeHead = vi.fn()
		mockRes.end = vi.fn()
		mockRes.writableEnded = false
		mockRes.closed = false
		mockRes.write = vi.fn((data, cb) => {
			// Simulate an error during write
			if (cb) cb(new Error('Write failed'))
			return true
		})

		// Trigger the handler
		requestListener(mockReq, mockRes)

		// Wait for spawn to emit data (which triggers res.write)
		await new Promise((r) => setTimeout(r, 50))

		// Assertions
		expect(mockRes.write).toHaveBeenCalled()
		// If the process didn't crash, we're good.
	})
})
