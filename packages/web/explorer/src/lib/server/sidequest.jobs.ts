// Handwritten producer-side stubs for Sidequest's manual job resolution.
//
// Sidequest looks up handlers by class name in the consumer's registry; the
// producer never invokes run() — it only needs the matching .name property
// and (for type safety) a signature that mirrors the worker's run() so that
// Sidequest.build(Stub).enqueue(payload) type-checks against the payload.
//
// Payload/result types come from src/lib/worker-api/, which is synced from
// packages/web/worker/src/api/ via `npm run sync-worker-types`. If you rename
// a job here, update the worker's src/sidequest.jobs.ts to match.
import { Job } from '@sidequest/core'
import type { PublishPayload, PublishResult } from '$lib/worker-api/publish.js'
import type { PreviewPayload, PreviewResult } from '$lib/worker-api/preview.js'
import type {
	JobProgressPurgePayload,
	JobProgressPurgeResult
} from '$lib/worker-api/job-progress-purge.js'

export class Publish extends Job {
	run(_payload?: PublishPayload): PublishResult {
		throw new Error('Publish: producer-side stub; runs in worker process')
	}
}

export class Preview extends Job {
	run(_payload: PreviewPayload): PreviewResult {
		throw new Error('Preview: producer-side stub; runs in worker process')
	}
}

export class JobProgressPurge extends Job {
	run(_payload?: JobProgressPurgePayload): JobProgressPurgeResult {
		throw new Error('JobProgressPurge: producer-side stub; runs in worker process')
	}
}
