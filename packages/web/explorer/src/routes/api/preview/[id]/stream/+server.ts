import type { RequestHandler } from './$types'
import { streamJobProgress } from '$lib/server/sse-progress.js'
import { assemblePreview, type PreviewWorkerResult } from '$lib/pieces/preview/assemble.server.js'
import { config } from '$lib/server/config'

export const GET: RequestHandler = ({ params, request, url }) => {
	const jobId = parseInt(params.id, 10)
	if (isNaN(jobId)) {
		return new Response('Invalid job ID', { status: 400 })
	}
	return streamJobProgress({
		jobId,
		jobClass: 'Preview',
		request,
		url,
		transformResult(result: unknown) {
			const r = result as PreviewWorkerResult
			const pieceConfig = config.pieces.find((p) => p.type === r.type)
			if (!pieceConfig) {
				throw new Error(`Unknown piece type: ${r.type}`)
			}
			return assemblePreview(r, pieceConfig)
		}
	})
}
