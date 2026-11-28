import { expect, test, vi } from 'vitest'
import { streamJobProgress } from '#lib/server/workflow/stream.js'
import { GET } from './+server.js'

vi.mock('#lib/server/workflow/stream.js', () => ({ streamJobProgress: vi.fn() }))

test('the shared stream only accepts jobs with an admin observer', async () => {
	const url = new URL('http://localhost/api/admin/jobs/job-id/stream')
	const request = new Request(url)
	const response = new Response('job stream', {
		headers: { 'Content-Type': 'text/event-stream' }
	})
	vi.mocked(streamJobProgress).mockReturnValue(response)
	const event = { params: { id: 'job-id' }, request, url } as Parameters<typeof GET>[0]
	expect(await GET(event)).toBe(response)
	expect(streamJobProgress).toHaveBeenCalledWith({
		jobId: 'job-id',
		jobClass: ['Preview', 'Publish', 'PublishAudit', 'Unpublish', 'RefreshIndex'],
		request,
		url
	})
})
