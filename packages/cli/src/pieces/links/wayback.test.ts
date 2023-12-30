import log from '../../lib/log.js'
import got from 'got'
import { vi, describe, test, afterEach, expect } from 'vitest'
import { availability } from './wayback.js'

vi.mock('../../lib/log')

const jsonResponseHeaders = { responseType: 'json' }

const mocks = {
	logError: vi.mocked(log.error),
	logWarn: vi.mocked(log.warn),
	gotGet: vi.spyOn(got, 'get'),
}

describe('pieces/links/wayback.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
	})

	test('availability', async () => {
		const url = 'https://example.com/boom'
		const body = { url, availability: { status: 'available' } }

		mocks.gotGet.mockResolvedValueOnce({ statusCode: 200, body })

		const available = await availability(url)

		expect(mocks.gotGet).toHaveBeenCalledWith(expect.any(String), {
			searchParams: { url },
			...jsonResponseHeaders,
		})
		expect(available).toEqual(body)
	})

	test('availability returns null', async () => {
		const url = 'https://example.com/boom'

		mocks.gotGet.mockResolvedValueOnce({ statusCode: 404 })

		const available = await availability(url)

		expect(mocks.gotGet).toHaveBeenCalledWith(expect.any(String), {
			searchParams: { url },
			...jsonResponseHeaders,
		})
		expect(available).toEqual(null)
	})

	test('availability logs error', async () => {
		const url = 'https://example.com/boom'

		mocks.gotGet.mockRejectedValueOnce(new Error('boom'))

		const available = await availability(url)

		expect(mocks.gotGet).toHaveBeenCalledWith(expect.any(String), {
			searchParams: { url },
			...jsonResponseHeaders,
		})
		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(available).toEqual(null)
	})
})
