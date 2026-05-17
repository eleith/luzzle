// Manual-resolution registry for Sidequest. The worker's engine looks up
// dispatched jobs by class name in this file (script field is a fixed string).
// Producers (e.g. explorer) keep a separate stub registry generated from this
// one — see scripts/generate-stubs.mjs.
export { Publish } from './jobs/publish.js'
export { JobProgressPurge } from './jobs/job-progress-purge.js'
export { Preview } from './jobs/preview.js'
