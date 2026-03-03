import type { TransformInput, AssetRecord } from './types.js'

export async function run({ webPiece, config }: TransformInput): Promise<AssetRecord[]> {
	const url = `${config.url.app}/api/pieces/${webPiece.type}/${webPiece.slug}/transform/palette`
	const response = await fetch(url)

	if (response.status === 404) {
		return []
	}

	if (!response.ok) {
		throw new Error(`palette transform failed: ${response.status} ${response.statusText}`)
	}

	const content = await response.text()

	return [
		{
			transformation: 'palette',
			asset_path: '',
			mime_type: 'application/json',
			is_embedded: 1,
			content,
		},
	]
}
