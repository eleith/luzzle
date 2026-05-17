// Manual-resolution registry for Sidequest. The worker's engine looks up
// dispatched jobs by class name in this file (script field is a fixed string).
// Producers (e.g. explorer) keep a handwritten stub registry whose class names
// must match the exports below; payload/result types are mirrored from src/api/
// into the producer via the explorer's `npm run sync-worker-types` command.
export { Publish } from './jobs/publish.js'
export { JobProgressPurge } from './jobs/job-progress-purge.js'
export { Preview } from './jobs/preview.js'
