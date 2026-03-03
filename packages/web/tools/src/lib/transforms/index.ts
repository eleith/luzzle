import * as attachment from './attachment.js'
import * as image from './image.js'
import * as opengraph from './opengraph.js'
import type { TransformInput, AssetRecord } from './types.js'

type Transform = {
	run: (input: TransformInput) => Promise<AssetRecord[]>
	cleanup?: () => Promise<void>
}

// Order matters: each transform may depend on assets produced by prior transforms.
// attachment → image → opengraph (last, depends on image assets and future palette transform)
export const transforms = new Map<string, Transform>([
	['attachment', attachment],
	['image', image],
	['opengraph', opengraph],
])

export async function cleanupAllTransforms(): Promise<void> {
	for (const transform of transforms.values()) {
		await transform.cleanup?.()
	}
}
