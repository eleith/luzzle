import type { RequestHandler } from './$types'
import { generateResponse } from '$lib/server/generation'

export const POST: RequestHandler = ({ request }) => generateResponse(request)
