import type { Pieces } from '@luzzle/core'
import { completed, type Step, type StepResult } from '../core/step.js'
import { getTransforms } from '../transforms/index.js'
import type { AssetRecord } from '../transforms/utils/types.js'
import type { ParsedPreview } from './preview-parse.js'
import type { PreviewAsset } from '@luzzle/web.jobs'

// order matters: opengraph depends on image assets written by earlier transforms
export const PREVIEW_TRANSFORM_NAMES = ['markdown', 'highlight', 'palette', 'image', 'opengraph'] as const
export type PreviewTransformName = (typeof PREVIEW_TRANSFORM_NAMES)[number]

export interface PreviewTransformInput {
	parsed: ParsedPreview
	pieces: Pieces
	outDir: string
	previewAssets?: PreviewAsset[]
}

export function previewTransformStep(
	name: PreviewTransformName
): Step<PreviewTransformInput, AssetRecord[]> {
	return {
		name,
		async run({ parsed, pieces, outDir, previewAssets }, ctx): Promise<StepResult<AssetRecord[]>> {
			const { config, logger } = ctx
			const transform = getTransforms().get(name)
			if (!transform) {
				return completed([], '0 record(s)')
			}

			const records = await transform.run({
				webPiece: parsed.webPiece,
				config,
				outDir,
				pieces,
				assetKeyToPath: parsed.keyToPath,
				logger,
				previewAssets,
			})

			return completed(records, `${records.length} record(s)`)
		},
	}
}
