import * as attachment from './attachment.js'
import * as image from './image.js'
import * as opengraph from './opengraph.js'
import type { TransformInput, AssetRecord } from './types.js'

type Transform = {
	run: (input: TransformInput) => Promise<AssetRecord[]>
	cleanup?: () => Promise<void>
}

export const transforms: Record<string, Transform> = { attachment, image, opengraph }

export async function cleanupAllTransforms(): Promise<void> {
	for (const transform of Object.values(transforms)) {
		await transform.cleanup?.()
	}
}
