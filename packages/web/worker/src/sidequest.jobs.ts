// Manual-resolution registry for Sidequest. The worker's engine looks up
// dispatched jobs by class name in this file. Producers (e.g. explorer)
// dispatch via stubs in @luzzle/web.jobs whose class names match the
// exports below; the shared package is the single source of truth for
// payload/result types.
export { Publish } from './jobs/publish.js'
export { JobProgressPurge } from './jobs/job-progress-purge.js'
export { Preview } from './jobs/preview.js'
