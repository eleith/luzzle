import { defineWorkflowSpec } from 'openworkflow'
import type {
	JobProgressPurgePayload,
	JobProgressPurgeResult,
	PreviewPayload,
	PreviewResult,
} from './types.js'

export const jobProgressPurgeSpec = defineWorkflowSpec<JobProgressPurgePayload, JobProgressPurgeResult>({
	name: 'JobProgressPurge',
})

export const previewSpec = defineWorkflowSpec<PreviewPayload, PreviewResult>({
	name: 'Preview',
})
