import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { access } from 'node:fs/promises'
import { probeStorage, probeWorker, probeOidcIssuer } from './probes.js'

vi.mock('node:fs/promises', () => ({ access: vi.fn(), constants: { W_OK: 2 } }))

const mocks = {
	access: vi.mocked(access)
}

describe('probeStorage', () => {
	test('resolves ok when the path is accessible', async () => {
		mocks.access.mockResolvedValue(undefined)

		expect(await probeStorage('/data')).toEqual({ ok: true })
	})

	test('resolves not-ok with the error message when access fails', async () => {
		mocks.access.mockRejectedValue(new Error('EACCES'))

		expect(await probeStorage('/data')).toEqual({ ok: false, reason: 'EACCES' })
	})
})

describe('probeWorker', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test('resolves ok when the worker responds successfully', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)

		const result = await probeWorker('http://worker:9000', 1000)

		expect(result).toEqual({ ok: true })
		expect(fetch).toHaveBeenCalledWith('http://worker:9000/health', expect.any(Object))
	})

	test('strips a trailing slash from the worker url before appending the path', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)

		await probeWorker('http://worker:9000/', 1000)

		expect(fetch).toHaveBeenCalledWith('http://worker:9000/health', expect.any(Object))
	})

	test('resolves not-ok when the worker responds with an error status', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response)

		const result = await probeWorker('http://worker:9000', 1000)

		expect(result).toEqual({ ok: false, reason: 'responded with 503' })
	})

	test('resolves not-ok on timeout', async () => {
		vi.mocked(fetch).mockImplementation(
			(_url, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => {
						const err = new Error('aborted')
						err.name = 'AbortError'
						reject(err)
					})
				})
		)

		const result = await probeWorker('http://worker:9000', 5)

		expect(result).toEqual({ ok: false, reason: 'timed out after 5ms' })
	})

	test('resolves not-ok on a network error', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

		const result = await probeWorker('http://worker:9000', 1000)

		expect(result).toEqual({ ok: false, reason: 'ECONNREFUSED' })
	})
})

describe('probeOidcIssuer', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test('probes the well-known configuration endpoint', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)

		const result = await probeOidcIssuer('https://issuer.example', 1000)

		expect(result).toEqual({ ok: true })
		expect(fetch).toHaveBeenCalledWith(
			'https://issuer.example/.well-known/openid-configuration',
			expect.any(Object)
		)
	})

	test('resolves not-ok when the issuer responds with an error status', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response)

		const result = await probeOidcIssuer('https://issuer.example', 1000)

		expect(result).toEqual({ ok: false, reason: 'responded with 404' })
	})
})
