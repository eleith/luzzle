import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import { encodeAssetPath } from '$lib/pieces/assets'
import { transformFamily } from './presentation'

export type OutputFile = {
	key: string
	path: string | null
	label: string
	mime: string
	url: string | undefined
}

export type OutputValue = {
	key: string
	output: string
	field: string
	value: string | null
	mime: string
}

export type OutputFamily = {
	name: string
	files: OutputFile[]
	values: OutputValue[]
}

export function groupAssetOutputs(
	assets: PublicWebPieceAsset[],
	fileUrl: (path: string) => string | undefined
) {
	const transforms = new Map<string, OutputFamily>()
	const seen = new Set<string>()

	for (const asset of assets) {
		const identity = JSON.stringify([
			asset.asset_key,
			asset.transformation,
			asset.asset_path || null,
			asset.mime_type,
			asset.content ?? null,
			Boolean(asset.is_embedded)
		])
		if (seen.has(identity)) continue
		seen.add(identity)

		const hasInline = asset.content != null || Boolean(asset.is_embedded)
		const hasFile = Boolean(asset.asset_path) || !hasInline
		const file: OutputFile = {
			key: asset.asset_key,
			path: asset.asset_path || null,
			label: asset.transformation,
			mime: asset.mime_type,
			url:
				hasFile && encodeAssetPath(asset.asset_path) !== undefined
					? fileUrl(asset.asset_path!)
					: undefined
		}

		const family = transformFamily(asset.transformation)
		let transform = transforms.get(family)
		if (!transform) {
			transform = { name: family, files: [], values: [] }
			transforms.set(family, transform)
		}
		if (hasFile) transform.files.push(file)
		if (hasInline)
			transform.values.push({
				key: asset.asset_key,
				output: asset.transformation,
				field: 'Content',
				value: asset.content ?? null,
				mime: asset.mime_type
			})
	}
	return { transforms: [...transforms.values()] }
}
