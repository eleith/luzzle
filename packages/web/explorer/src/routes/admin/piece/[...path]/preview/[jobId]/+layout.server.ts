import { error } from '@sveltejs/kit'
import { Sidequest } from 'sidequest'
import { config } from '$lib/server/config'
import { assemblePreview, type PreviewWorkerResult } from '$lib/pieces/preview/assemble.server.js'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ params }) => {
	const jobId = parseInt(params.jobId, 10)
	if (isNaN(jobId)) {
		return error(400, 'Invalid job ID')
	}

	let job: Awaited<ReturnType<typeof Sidequest.job.get>>
	try {
		job = await Sidequest.job.get(jobId)
	} catch {
		return error(404, 'Preview not found')
	}

	if (!job || job.class !== 'Preview') {
		return error(404, 'Preview not found')
	}

	if (job.state === 'completed' && job.result) {
		const retentionMs = 2 * 24 * 60 * 60 * 1000
		const isExpired = job.completed_at && Date.now() - job.completed_at.getTime() > retentionMs
		if (isExpired) {
			return { file: params.path, status: 'expired' as const, jobId }
		}

		const result = job.result as PreviewWorkerResult
		const pieceConfig = config.pieces.find((p) => p.type === result.type)
		if (!pieceConfig) {
			return error(500, `Unknown piece type: ${result.type}`)
		}
		const assembled = assemblePreview(result, pieceConfig)
		return { file: params.path, status: 'completed' as const, jobId, ...assembled }
	}

	if (job.state === 'failed' || job.state === 'canceled') {
		const errors = job.errors as { message?: string }[] | undefined
		return {
			file: params.path,
			status: 'failed' as const,
			jobId,
			errorMessage: errors?.[0]?.message ?? 'Preview failed'
		}
	}

	return { file: params.path, jobId, status: job.state as 'waiting' | 'running' }
}
