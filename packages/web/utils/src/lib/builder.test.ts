import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerBuilder } from './builder.js'
import { type Schema } from './config/schema.js'

type BuilderConfig = Schema['builder']

describe('triggerBuilder', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	it('should throw error if URL is not configured', async () => {
		await expect(triggerBuilder({} as BuilderConfig, 'build')).rejects.toThrow(
			'Builder URL not configured'
		)
	})

	it('should correctly set the action parameter if missing', async () => {
		const config = { url: 'http://builder.local/hooks' } as BuilderConfig
		const mockResponse = new Response('ok')
		vi.mocked(fetch).mockResolvedValue(mockResponse)

		await triggerBuilder(config, 'build')

		const calledUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
		expect(calledUrl.searchParams.get('action')).toBe('build')
	})

	it('should NOT overwrite the action parameter if already present', async () => {
		const config = { url: 'http://builder.local/hooks?action=deploy' } as BuilderConfig
		const mockResponse = new Response('ok')
		vi.mocked(fetch).mockResolvedValue(mockResponse)

		await triggerBuilder(config, 'build')

		const calledUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
		expect(calledUrl.searchParams.get('action')).toBe('deploy')
	})

	it('should use configured method, headers, and body', async () => {
		const config = {
			url: 'http://builder.local/hooks',
			method: 'PUT',
			headers: { 'X-Token': 'secret' },
			body: '{"test": true}'
		} as BuilderConfig
		const mockResponse = new Response('ok')
		vi.mocked(fetch).mockResolvedValue(mockResponse)

		await triggerBuilder(config, 'sync')
		const options = vi.mocked(fetch).mock.calls[0][1]
		expect(options?.method).toBe('PUT')
		expect((options?.headers as Record<string, string>)['X-Token']).toBe('secret')
		expect(options?.body).toBe('{"test": true}')
	})

	it('should default to POST and empty body', async () => {
		const config = { url: 'http://builder.local/hooks' } as BuilderConfig
		const mockResponse = new Response('ok')
		vi.mocked(fetch).mockResolvedValue(mockResponse)

		await triggerBuilder(config, 'build')

		const options = vi.mocked(fetch).mock.calls[0][1]
		expect(options?.method).toBe('POST')
		expect(options?.body).toBeNull()
	})
})
