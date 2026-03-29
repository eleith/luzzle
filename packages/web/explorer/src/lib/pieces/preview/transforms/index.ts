import type { PreviewAssetRecord, PreviewContext, PreviewResolver } from './types.js'
import { attachmentResolver } from './attachment.js'
import { imageResolver } from './image.js'

const previewResolvers: PreviewResolver[] = [attachmentResolver, imageResolver]

export async function resolvePreviewAssets(context: PreviewContext): Promise<PreviewAssetRecord[]> {
	const assets: PreviewAssetRecord[] = []
	for (const resolver of previewResolvers) {
		const resolved = await resolver.resolve(context)
		assets.push(...resolved)
	}
	return assets
}
