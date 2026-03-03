import * as attachment from './attachment.js'
import * as image from './image.js'
import * as opengraph from './opengraph.js'
import type { TransformInput } from './types.js'

type Transform = {
	run: (input: TransformInput) => Promise<void>
	cleanup?: () => Promise<void>
}

export const transforms: Transform[] = [attachment, image, opengraph]

export async function cleanupTransforms(): Promise<void> {
	for (const transform of transforms) {
		await transform.cleanup?.()
	}
}
