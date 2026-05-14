import { describe, expect, test, afterEach } from 'vitest'
import { createHealthServer } from './index.js'
import type { Server } from 'node:http'

describe('createHealthServer', () => {
	let server: Server | undefined

	afterEach(
		() =>
			new Promise<void>((resolve) => {
				if (!server) {
					resolve()
					return
				}
				server.close(() => resolve())
				server = undefined
			})
	)

	test('returns 200 with { status: "ok" } at /health', async () => {
		server = createHealthServer()
		await new Promise<void>((resolve) => server!.listen(0, resolve))
		const address = server.address()
		if (!address || typeof address === 'string') throw new Error('expected AddressInfo')

		const res = await fetch(`http://127.0.0.1:${address.port}/health`)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ status: 'ok' })
	})

	test('returns 404 for unknown paths', async () => {
		server = createHealthServer()
		await new Promise<void>((resolve) => server!.listen(0, resolve))
		const address = server.address()
		if (!address || typeof address === 'string') throw new Error('expected AddressInfo')

		const res = await fetch(`http://127.0.0.1:${address.port}/nope`)
		expect(res.status).toBe(404)
	})
})
