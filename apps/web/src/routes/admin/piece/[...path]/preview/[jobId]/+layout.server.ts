import { error } from '@sveltejs/kit'
import { config } from '$lib/server/config'
import { assemblePreview, type PreviewWorkerResult } from '$lib/pieces/preview/assemble.server.js'
import { getOpenWorkflowDb } from '$lib/server/database/openworkflow.js'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ params }) => {
	const jobId = parseInt(params.jobId, 10)
	if (isNaN(jobId)) {
		return error(400, 'Invalid job ID')
	}

	let run: { status: string; error: string | null; output: string | null; finished_at: string | null } | undefined

	// Try OpenWorkflow first
	try {
		const owDb = getOpenWorkflowDb()
		const stmt = owDb.prepare('SELECT status, error, output, finished_at FROM workflow_runs WHERE json_extract(input, \'$.jobId\') = ? LIMIT 1')
		run = stmt.get(jobId) as typeof run
	} catch (err) {
		console.error('Failed to query OpenWorkflow preview run:', err)
	}

	if (!run) {
		return error(404, 'Preview not found')
	}

	let state = 'waiting'
	if (run.status === 'running') state = 'running'
	if (run.status === 'completed' || run.status === 'succeeded') state = 'completed'
	if (run.status === 'failed') state = 'failed'
	if (run.status === 'canceled') state = 'canceled'

	if (state === 'completed' && run.output) {
		const retentionMs = 2 * 24 * 60 * 60 * 1000
		const completedAt = run.finished_at ? new Date(run.finished_at) : null
		const isExpired = completedAt && Date.now() - completedAt.getTime() > retentionMs
		if (isExpired) {
			return { file: params.path, status: 'expired' as const, jobId }
		}

		const result = JSON.parse(run.output) as PreviewWorkerResult
		const pieceConfig = config.pieces.find((p) => p.type === result.type)
		if (!pieceConfig) {
			return error(500, `Unknown piece type: ${result.type}`)
		}
		const assembled = assemblePreview(result, pieceConfig)
		return { file: params.path, status: 'completed' as const, jobId, ...assembled }
	}

	if (state === 'failed' || state === 'canceled') {
		return {
			file: params.path,
			status: 'failed' as const,
			jobId,
			errorMessage: run.error ?? 'Preview failed'
		}
	}

	return { file: params.path, jobId, status: state as 'waiting' | 'running' }
}
