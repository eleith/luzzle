import { createServer } from 'node:http'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { createFixture } from './support/fixture.ts'

const server = createServer()
function shutdown() {
	server.close(() => process.exit(0))
	server.closeIdleConnections()
	setTimeout(() => process.exit(1), 5000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('disconnect', shutdown)

// Bind before writing config so the browser, auth and Kit share the actual origin.
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const origin = `http://localhost:${(server.address() as AddressInfo).port}`
await createFixture(process.cwd(), origin)
process.env.ORIGIN = origin
process.env.PROTOCOL_HEADER = 'x-forwarded-proto'
const { handler } = await import(new URL('../build/handler.js', import.meta.url).href)
server.on('request', (request, response) => {
	request.headers['x-forwarded-proto'] = 'http'
	handler(request, response)
})
process.send!({ origin })
