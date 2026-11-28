import { previewSpec, refreshIndexSpec } from '@luzzle/web.jobs/specs'
import { streamJobProgress } from '#lib/server/workflow/stream.js'
import { publicationWorkflowNames } from '#lib/server/workflow/publish.js'
import type { RequestHandler } from './$types'

const streamedJobs = [previewSpec.name, ...publicationWorkflowNames, refreshIndexSpec.name]

export const GET: RequestHandler = ({ params, request, url }) =>
	streamJobProgress({ jobId: params.id, jobClass: streamedJobs, request, url })
