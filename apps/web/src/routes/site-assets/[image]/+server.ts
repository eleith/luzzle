import { config } from '#lib/server/config.js'
import { createSiteImageHandler } from '#lib/server/site-images.js'
import type { RequestHandler } from './$types'

const imageResponse = createSiteImageHandler(config)

export const GET: RequestHandler = ({ params, request }) => imageResponse(params.image, request)
export const HEAD = GET
