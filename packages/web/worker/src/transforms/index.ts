import * as attachment from './attachment.js'
import * as image from './image.js'
import * as palette from './palette/index.js'
import * as highlight from './highlight/index.js'
import * as markdown from './markdown/index.js'
import * as opengraph from './opengraph.js'
import type { TransformInput, AssetRecord } from './utils/types.js'

type Transform = {
	run: (input: TransformInput) => Promise<AssetRecord[]>
	cleanup?: () => Promise<void>
}

const transforms = new Map<string, Transform>([
	['attachment', attachment],
	['image', image],
	['palette', palette],
	['highlight', highlight],
	['markdown', markdown],
	['opengraph', opengraph],
])

export function getTransforms(): Map<string, Transform> {
	return transforms
}

export async function cleanupAllTransforms(): Promise<void> {
	for (const transform of transforms.values()) {
		await transform.cleanup?.()
	}
}
