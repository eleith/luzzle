import { expect, test, vi } from 'vitest'
import { streamJobProgress } from '$lib/server/workflow/stream.js'
import { GET } from './+server.js'

vi.mock('$lib/server/workflow/stream.js', () => ({ streamJobProgress: vi.fn() }))

test('the preview progress stream remains independently available', async () => {
	const url = new URL('http://localhost/api/admin/preview/preview-id/stream')
	const request = new Request(url)
	const response = new Response('preview stream', {
		headers: { 'Content-Type': 'text/event-stream' }
	})
	vi.mocked(streamJobProgress).mockReturnValue(response)
	const event = { params: { id: 'preview-id' }, request, url } as Parameters<typeof GET>[0]
	expect(await GET(event)).toBe(response)
	expect(streamJobProgress).toHaveBeenCalledWith({
		jobId: 'preview-id',
		jobClass: 'Preview',
		request,
		url
	})
})
