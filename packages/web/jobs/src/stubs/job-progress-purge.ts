import { createJobStub } from '../factory.js'
import type {
	JobProgressPurgePayload,
	JobProgressPurgeResult
} from '../types/job-progress-purge.js'

export const JobProgressPurge = createJobStub<
	JobProgressPurgePayload,
	JobProgressPurgeResult
>('JobProgressPurge')
