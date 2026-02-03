import { createServer as httpServer } from 'http'
import { spawn as defaultSpawn } from 'child_process'
import { parse } from 'url'

const PORT = 9000
const BUILD_SCRIPT = process.env.LUZZLE_BUILD_SCRIPT || '/app/scripts/build.sh'
const BUILD_SECRET_TOKEN = process.env.LUZZLE_BUILD_TOKEN
const BUILD_WEBHOOK = '/hooks/build'
const DEFAULT_TIMEOUT_MS = 3600000 // 1 hour

class BuildManager {
	constructor(spawnFn, timeoutMs) {
		this.spawnFn = spawnFn
		this.timeoutMs = timeoutMs
		this.currentBuild = null
	}

	hasActiveBuild() {
		return !!this.currentBuild
	}

	attach(req, res) {
		console.log(`[${new Date().toISOString()}] Client attaching to existing build...`)
		const build = this.currentBuild

		// Replay history
		for (const chunk of build.logs) {
			res.write(chunk)
		}

		// Subscribe
		build.clients.add(res)
		req.on('close', () => build.clients.delete(res))
	}

	start(req, res) {
		console.log(`[${new Date().toISOString()}] Starting deployment...`)
		
		this.currentBuild = {
			logs: [],
			clients: new Set([res]),
			timeout: null,
		}

		// Handle initiator disconnect
		req.on('close', () => this.currentBuild?.clients.delete(res))

		const startMsg = `Starting deployment script at ${new Date().toISOString()} (Timeout: ${this.timeoutMs}ms)...\n`
		this.broadcast(startMsg) // Broadcast adds to logs too

		const child = this.spawnFn('bash', [BUILD_SCRIPT])

		// Safety Timeout
		this.currentBuild.timeout = setTimeout(() => {
			const msg = `\n[TIMEOUT] Build exceeded ${this.timeoutMs}ms. Terminating process...\n`
			console.error(`[${new Date().toISOString()}] ${msg.trim()}`)
			this.broadcast(msg)
			child.kill()
		}, this.timeoutMs)

		child.stdout.on('data', (data) => {
			process.stdout.write(data)
			this.broadcast(data)
		})

		child.stderr.on('data', (data) => {
			process.stderr.write(data)
			this.broadcast(data)
		})

		child.on('error', (error) => {
			const msg = `\nError: Failed to start script: ${error.message}\n`
			console.error(`[${new Date().toISOString()}] ${msg.trim()}`)
			this.broadcast(msg)
			this.cleanup()
		})

		child.on('close', (code) => {
			const msg = `\nBuild finished with exit code ${code} at ${new Date().toISOString()}\n`
			console.log(`[${new Date().toISOString()}] Script exited with code ${code}`)
			this.broadcast(msg)
			this.cleanup()
		})
	}

	broadcast(data) {
		if (!this.currentBuild) return

		// Store history
		this.currentBuild.logs.push(data)

		// Send to clients
		for (const client of this.currentBuild.clients) {
			if (!client.writableEnded && !client.closed) {
				client.write(data, (err) => {
					if (err) {
						// Error callback (swallowed as per original logic)
					}
				})
			}
		}
	}

	cleanup() {
		if (!this.currentBuild) return

		if (this.currentBuild.timeout) {
			clearTimeout(this.currentBuild.timeout)
		}

		for (const client of this.currentBuild.clients) {
			client.end()
		}
		this.currentBuild = null
	}
}

function createServer(spawnFn = defaultSpawn) {
	const buildTimeoutMs = parseFloat(process.env.LUZZLE_BUILD_TIMEOUT) || DEFAULT_TIMEOUT_MS
	const manager = new BuildManager(spawnFn, buildTimeoutMs)

	const server = httpServer((req, res) => {
		const parsedUrl = parse(req.url, true)

		// 1. Validation
		if (req.method !== 'POST' || parsedUrl.pathname !== BUILD_WEBHOOK) {
			res.writeHead(404, { 'Content-Type': 'text/plain' })
			return res.end('Not Found')
		}

		const requestToken = parsedUrl.query.token
		if (!BUILD_SECRET_TOKEN || requestToken !== BUILD_SECRET_TOKEN) {
			console.warn(`[${new Date().toISOString()}] Unauthorized access attempt from ${req.socket.remoteAddress}`)
			res.writeHead(401, { 'Content-Type': 'text/plain' })
			return res.end('Unauthorized')
		}

		// 2. Setup Headers
		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Transfer-Encoding': 'chunked',
			'X-Content-Type-Options': 'nosniff',
			'X-Accel-Buffering': 'no',
		})

		// 3. Delegate to Manager
		if (manager.hasActiveBuild()) {
			manager.attach(req, res)
		} else {
			manager.start(req, res)
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
