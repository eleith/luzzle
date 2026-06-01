import { defineWorkflowSpec } from 'openworkflow'
import type { JobProgressPurgePayload, JobProgressPurgeResult } from './types.js'

export const jobProgressPurgeSpec = defineWorkflowSpec<
	JobProgressPurgePayload,
	JobProgressPurgeResult
>({
	name: 'JobProgressPurge'
})
