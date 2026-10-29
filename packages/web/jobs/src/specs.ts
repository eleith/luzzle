import { defineWorkflowSpec } from 'openworkflow'
import type { PiecesDiff } from '@luzzle/core'
import type {
	JobProgressPurgePayload,
	JobProgressPurgeResult,
	PreviewPayload,
	PreviewResult,
	PublishPayload,
	PublishResult,
	PublishAuditPayload,
	UnpublishPayload,
	UnpublishResult,
	TestConnectivityPayload,
	TestConnectivityResult,
} from './types.js'

export const jobProgressPurgeSpec = defineWorkflowSpec<
	JobProgressPurgePayload,
	JobProgressPurgeResult
>({
	name: 'JobProgressPurge',
	schedules: [
		{
			id: 'luzzle:job-progress-purge',
			cron: '48 1 * * *',
			timezone: 'UTC',
			input: { retentionDays: 7 },
		},
	],
})

export const previewSpec = defineWorkflowSpec<PreviewPayload, PreviewResult>({
	name: 'Preview',
})

export const publishSpec = defineWorkflowSpec<PublishPayload, PublishResult>({
	name: 'Publish',
})

export const publishAuditSpec = defineWorkflowSpec<PublishAuditPayload, PiecesDiff>({
	name: 'PublishAudit',
})

export const unpublishSpec = defineWorkflowSpec<UnpublishPayload, UnpublishResult>({
	name: 'Unpublish',
})

export const testConnectivitySpec = defineWorkflowSpec<
	TestConnectivityPayload,
	TestConnectivityResult
>({
	name: 'TestConnectivity',
})
