import { createJobStub } from './factory.js'
import type {
	PublishPayload,
	PublishResult,
	PreviewPayload,
	PreviewResult,
	JobProgressPurgePayload,
	JobProgressPurgeResult
} from './types.js'

export const Publish = createJobStub<PublishPayload, PublishResult>('Publish')
export const Preview = createJobStub<PreviewPayload, PreviewResult>('Preview')
export const JobProgressPurge = createJobStub<
	JobProgressPurgePayload,
	JobProgressPurgeResult
>('JobProgressPurge')
