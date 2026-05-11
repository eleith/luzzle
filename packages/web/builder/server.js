import { createServer as httpServer } from 'http'
import { spawn as defaultSpawn } from 'child_process'
import { parse, fileURLToPath } from 'url'

const PORT = 9000
const BUILD_SECRET_TOKEN = process.env.LUZZLE_BUILD_TOKEN
const BUILD_TIMEOUT_MS = parseFloat(process.env.LUZZLE_BUILD_TIMEOUT) || 3600000 // 1 hour

const HOOKS = {
	PUBLISH: {
		PATH: '/hooks',
		SCRIPT: '/app/scripts/publish.sh',
		ACTION: 'publish',
	},
}

class ScriptRunner {
	constructor(spawnFn, timeoutMs) {
		this.spawnFn = spawnFn
		this.timeoutMs = timeoutMs
		this.activeProcess = null
	}

	async run(script, onData, onEnd) {
		await this._execute(script, onData)
		onEnd(0)
	}

	_execute(script, onData) {
		return new Promise((resolve, reject) => {
			onData(`\n[${new Date().toISOString()}] Executing: ${script}\n`)

			const child = this.spawnFn('bash', [script])
			this.activeProcess = child
			let timedOut = false

			const timeout = setTimeout(() => {
				timedOut = true
				onData(`\n[TIMEOUT] Script exceeded ${this.timeoutMs}ms. Terminating...\n`)
				child.kill()
				reject(new Error('Timeout'))
			}, this.timeoutMs)

			child.stdout.on('data', onData)
			child.stderr.on('data', onData)

			child.on('error', (error) => {
				if (timedOut) return
				clearTimeout(timeout)
				onData(`\nError: ${error.message}\n`)
				reject(error)
			})

			child.on('close', (code) => {
				if (timedOut) return
				clearTimeout(timeout)
				this.activeProcess = null
				if (code === 0) resolve()
				else reject(new Error(`Exit code ${code}`))
			})
		})
	}
}

class Manager {
	constructor(spawnFn, timeoutMs) {
		this.spawnFn = spawnFn
		this.timeoutMs = timeoutMs
		this.currentRun = null
	}

	hasActiveRun() {
		return !!this.currentRun
	}

	attach(req, res) {
		console.log(`[${new Date().toISOString()}] Client attaching to active run...`)
		const run = this.currentRun
		for (const chunk of run.logs) res.write(chunk)
		run.clients.add(res)
		req.on('close', () => run.clients.delete(res))
	}

	start(req, res, script, action) {
		console.log(`[${new Date().toISOString()}] Starting run for ${script}`)

		this.currentRun = {
			action,
			logs: [],
			clients: new Set([res]),
		}

		req.on('close', () => this.currentRun?.clients.delete(res))

		const runner = new ScriptRunner(this.spawnFn, this.timeoutMs)
		runner
			.run(
				script,
				(data) => this.broadcast(data),
				(code) => {
					this.broadcast(`\nFinished with exit code ${code} at ${new Date().toISOString()}\n`)
					this.cleanup()
				}
			)
			.catch((err) => {
				this.broadcast(`\nRun failed: ${err.message}\n`)
				this.cleanup()
			})
	}

	attachOrStart(req, res, script, action) {
		if (this.hasActiveRun()) {
			this.attach(req, res)
		} else {
			this.start(req, res, script, action)
		}
	}

	broadcast(data) {
		if (!this.currentRun) return
		this.currentRun.logs.push(data)
		for (const client of this.currentRun.clients) {
			if (!client.writableEnded && !client.closed) {
				client.write(data)
			}
		}
	}

	cleanup() {
		if (!this.currentRun) return
		for (const client of this.currentRun.clients) client.end()
		this.currentRun = null
	}
}

function createServer(spawnFn = defaultSpawn, timeoutMs = BUILD_TIMEOUT_MS) {
	const runManager = new Manager(spawnFn, timeoutMs)

	const server = httpServer((req, res) => {
		const parsedUrl = parse(req.url, true)
		const pathname = parsedUrl.pathname
		const requestToken = parsedUrl.query.token
		const requestAction = parsedUrl.query.action

		const isPublish = pathname === HOOKS.PUBLISH.PATH && requestAction === HOOKS.PUBLISH.ACTION
		const isValidAction = isPublish

		if (req.method !== 'POST' || !isValidAction) {
			res.writeHead(404, { 'Content-Type': 'text/plain' })
			return res.end('Not Found')
		}

		if (!BUILD_SECRET_TOKEN || requestToken !== BUILD_SECRET_TOKEN) {
			res.writeHead(401, { 'Content-Type': 'text/plain' })
			return res.end('Unauthorized')
		}

		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Transfer-Encoding': 'chunked',
			'X-Content-Type-Options': 'nosniff',
			'X-Accel-Buffering': 'no',
		})

		if (isPublish) {
			runManager.attachOrStart(req, res, HOOKS.PUBLISH.SCRIPT, HOOKS.PUBLISH.ACTION)
		}
	})

	return server
}

const server = createServer()

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	server.listen(PORT, '0.0.0.0', () => {
		console.log(`Luzzle Web Builder listening on port ${PORT}`)
		if (!BUILD_SECRET_TOKEN) {
			console.error('WARNING: LUZZLE_BUILD_TOKEN env var is not set! Auth will fail.')
		}
	})
}
/* c8 ignore stop */

export { server, createServer }
