import { error } from '@sveltejs/kit'
import { Sidequest } from 'sidequest'
import { config } from '$lib/server/config'
import { assemblePreview, type PreviewWorkerResult } from '$lib/pieces/preview/assemble.server.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
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
		const result = job.result as PreviewWorkerResult
		const pieceConfig = config.pieces.find((p) => p.type === result.type)
		if (!pieceConfig) {
			return error(500, `Unknown piece type: ${result.type}`)
		}
		const assembled = assemblePreview(result, pieceConfig)
		return { file: params.path, status: 'completed' as const, ...assembled }
	}

	if (job.state === 'failed' || job.state === 'canceled') {
		const errors = job.errors as { message?: string }[] | undefined
		return {
			file: params.path,
			status: 'failed' as const,
			errorMessage: errors?.[0]?.message ?? 'Preview failed'
		}
	}

	return { file: params.path, jobId, status: job.state as 'waiting' | 'running' }
}
