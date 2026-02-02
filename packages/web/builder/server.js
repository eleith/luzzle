const http = require('http')
const { spawn: defaultSpawn } = require('child_process')
const url = require('url')

const PORT = 9000
const BUILD_SCRIPT = process.env.LUZZLE_BUILD_SCRIPT || '/app/scripts/build.sh'
const BUILD_SECRET_TOKEN = process.env.LUZZLE_BUILD_TOKEN
const BUILD_WEBHOOK = '/hooks/build'

// State needs to be encapsulated if we want to test concurrency cleanly across tests
function createServer(spawnFn = defaultSpawn) {
	let isBuilding = false

	const server = http.createServer((req, res) => {
		const parsedUrl = url.parse(req.url, true)

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

		if (isBuilding) {
			console.warn(`[${new Date().toISOString()}] Build rejected: already running.`)
			res.writeHead(429, { 'Content-Type': 'text/plain' })
			return res.end('Build already in progress. Please wait.')
		}

		isBuilding = true
		console.log(`[${new Date().toISOString()}] Starting deployment...`)

		// Set headers for streaming text
		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Transfer-Encoding': 'chunked',
			'X-Content-Type-Options': 'nosniff',
		})

		res.write(`Starting deployment script at ${new Date().toISOString()}...\n`)

		const child = spawnFn('bash', [BUILD_SCRIPT])

		child.stdout.on('data', (data) => {
			process.stdout.write(data) // Log to Docker
			if (!res.writableEnded && !res.closed) {
				res.write(data, (err) => {
					if (err) console.error('Client disconnected, stopped streaming to HTTP')
				})
			}
		})

		child.stderr.on('data', (data) => {
			process.stderr.write(data) // Log to Docker
			if (!res.writableEnded && !res.closed) {
				res.write(data, (err) => {
					if (err) console.error('Client disconnected, stopped streaming to HTTP')
				})
			}
		})

		req.on('close', () => {
			console.log(
				`[${new Date().toISOString()}] Client disconnected from stream. Script continues in background.`
			)
		})

		child.on('error', (error) => {
			console.error(`[${new Date().toISOString()}] Failed to start script: ${error.message}`)
			res.write(`\nError: Failed to start script: ${error.message}\n`)
			isBuilding = false
			res.end()
		})

		child.on('close', (code) => {
			console.log(`[${new Date().toISOString()}] Script exited with code ${code}`)
			res.write(`\nBuild finished with exit code ${code} at ${new Date().toISOString()}\n`)
			isBuilding = false
			res.end()
		})
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

module.exports = { server, createServer }
