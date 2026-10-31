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

type WorkflowSpec<Input, Output> = ReturnType<typeof defineWorkflowSpec<Input, Output>>

export const jobProgressPurgeSpec: WorkflowSpec<JobProgressPurgePayload, JobProgressPurgeResult> =
	defineWorkflowSpec<JobProgressPurgePayload, JobProgressPurgeResult>({
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

export const previewSpec: WorkflowSpec<PreviewPayload, PreviewResult> = defineWorkflowSpec<
	PreviewPayload,
	PreviewResult
>({
	name: 'Preview',
})

export const publishSpec: WorkflowSpec<PublishPayload, PublishResult> = defineWorkflowSpec<
	PublishPayload,
	PublishResult
>({
	name: 'Publish',
})

export const publishAuditSpec: WorkflowSpec<PublishAuditPayload, PiecesDiff> = defineWorkflowSpec<
	PublishAuditPayload,
	PiecesDiff
>({
	name: 'PublishAudit',
})

export const unpublishSpec: WorkflowSpec<UnpublishPayload, UnpublishResult> = defineWorkflowSpec<
	UnpublishPayload,
	UnpublishResult
>({
	name: 'Unpublish',
})

export const testConnectivitySpec: WorkflowSpec<TestConnectivityPayload, TestConnectivityResult> =
	defineWorkflowSpec<TestConnectivityPayload, TestConnectivityResult>({
		name: 'TestConnectivity',
	})
