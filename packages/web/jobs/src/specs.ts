import { defineWorkflowSpec } from 'openworkflow'
import type { PiecesDiff } from '@luzzle/core'
import type {
	JobProgressPurgePayload,
	JobProgressPurgeResult,
	PreviewPayload,
	PreviewResult,
	PublishPayload,
	PublishAuditPayload,
} from './types.js'

export const jobProgressPurgeSpec = defineWorkflowSpec<
	JobProgressPurgePayload,
	JobProgressPurgeResult
>({
	name: 'JobProgressPurge',
})

export const previewSpec = defineWorkflowSpec<PreviewPayload, PreviewResult>({
	name: 'Preview',
})

export const publishSpec = defineWorkflowSpec<PublishPayload, PiecesDiff>({
	name: 'Publish',
})

export const publishAuditSpec = defineWorkflowSpec<PublishAuditPayload, PiecesDiff>({
	name: 'PublishAudit',
})
