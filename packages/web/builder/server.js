import { createServer as httpServer } from 'http'
import { spawn as defaultSpawn } from 'child_process'
import { parse } from 'url'

const PORT = 9000
const BUILD_SCRIPT = process.env.LUZZLE_BUILD_SCRIPT || '/app/scripts/build.sh'
const BUILD_SECRET_TOKEN = process.env.LUZZLE_BUILD_TOKEN
const BUILD_WEBHOOK = '/hooks/build'
const DEFAULT_TIMEOUT_MS = 3600000 // 1 hour

// State needs to be encapsulated if we want to test concurrency cleanly across tests
function createServer(spawnFn = defaultSpawn) {
	let currentBuild = null
	const buildTimeoutMs =
		parseFloat(process.env.LUZZLE_BUILD_TIMEOUT) || DEFAULT_TIMEOUT_MS

	const server = httpServer((req, res) => {
		const parsedUrl = parse(req.url, true)

		if (req.method !== 'POST' || parsedUrl.pathname !== BUILD_WEBHOOK) {
			res.writeHead(404, { 'Content-Type': 'text/plain' })
			return res.end('Not Found')
		}

		const requestToken = parsedUrl.query.token
		if (!BUILD_SECRET_TOKEN || requestToken !== BUILD_SECRET_TOKEN) {
			console.warn(
				`[${new Date().toISOString()}] Unauthorized access attempt from ${req.socket.remoteAddress}`
			)
			res.writeHead(401, { 'Content-Type': 'text/plain' })
			return res.end('Unauthorized')
		}

		// Set headers for streaming text
		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Transfer-Encoding': 'chunked',
			'X-Content-Type-Options': 'nosniff',
			'X-Accel-Buffering': 'no',
		})

		// 1. If a build is already running, attach to it
		if (currentBuild) {
			console.log(`[${new Date().toISOString()}] Client attaching to existing build...`)

			// Replay history so far
			for (const chunk of currentBuild.logs) {
				res.write(chunk)
			}

			// Add to active subscribers
			currentBuild.clients.add(res)

			// Handle disconnect
			req.on('close', () => {
				currentBuild?.clients.delete(res)
			})
			return
		}

		// 2. Start a new build
		console.log(`[${new Date().toISOString()}] Starting deployment...`)
		currentBuild = {
			logs: [],
			clients: new Set([res]),
			timeout: null,
		}

		// Handle disconnect for the initiator
		req.on('close', () => {
			currentBuild?.clients.delete(res)
		})

		const startMsg = `Starting deployment script at ${new Date().toISOString()} (Timeout: ${buildTimeoutMs}ms)...\n`
		currentBuild.logs.push(startMsg)
		res.write(startMsg)

		const child = spawnFn('bash', [BUILD_SCRIPT])

		// Safety Timeout
		currentBuild.timeout = setTimeout(() => {
			const msg = `\n[TIMEOUT] Build exceeded ${buildTimeoutMs}ms. Terminating process...\n`
			console.error(`[${new Date().toISOString()}] ${msg.trim()}`)
			broadcast(msg)
			child.kill() // This will trigger 'close' event
		}, buildTimeoutMs)

		const broadcast = (data) => {
			if (!currentBuild) return

			// Store in history
			currentBuild.logs.push(data)

			// Send to all connected clients
			for (const client of currentBuild.clients) {
				if (!client.writableEnded && !client.closed) {
					client.write(data, (err) => {
						if (err) {
							// Client likely disconnected; 'close' event will handle removal
						}
					})
				}
			}
		}

		child.stdout.on('data', (data) => {
			process.stdout.write(data) // Log to Docker stdout
			broadcast(data)
		})

		child.stderr.on('data', (data) => {
			process.stderr.write(data) // Log to Docker stderr
			broadcast(data)
		})

		child.on('error', (error) => {
			const msg = `\nError: Failed to start script: ${error.message}\n`
			console.error(`[${new Date().toISOString()}] ${msg.trim()}`)
			broadcast(msg)

			cleanup()
		})

		child.on('close', (code) => {
			const msg = `\nBuild finished with exit code ${code} at ${new Date().toISOString()}\n`
			console.log(`[${new Date().toISOString()}] Script exited with code ${code}`)
			broadcast(msg)

			cleanup()
		})

		function cleanup() {
			if (!currentBuild) return

			if (currentBuild.timeout) clearTimeout(currentBuild.timeout)

			// Close all connections
			for (const client of currentBuild.clients) {
				client.end()
			}
			currentBuild = null
		}
	})

	return server
}

const server = createServer()

/* c8 ignore start */
if (require.main === module) {
	server.listen(PORT, '0.0.0.0', () => {
		console.log(`Builder sidecar listening on port ${PORT}`)
		if (!BUILD_SECRET_TOKEN) {
			console.error('WARNING: BUILD_SECRET_TOKEN env var is not set! Auth will fail.')
		}
	})
}
/* c8 ignore stop */

export { server, createServer }
