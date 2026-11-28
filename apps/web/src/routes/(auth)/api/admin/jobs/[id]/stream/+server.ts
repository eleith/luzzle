import { refreshIndexSpec } from '@luzzle/web.jobs/specs'
import { streamJobProgress } from '#lib/server/workflow/stream.js'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = ({ params, request, url }) =>
	streamJobProgress({ jobId: params.id, jobClass: refreshIndexSpec.name, request, url })
