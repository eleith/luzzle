import { encodeAssetPath } from '$lib/pieces/assets'

export function previewOutputUrl(path: string, job: string): string | undefined {
	const encoded = encodeAssetPath(path)
	const encodedJob = encodeAssetPath(job)
	if (!encoded || !encodedJob || job.includes('/')) return undefined
	return `/admin/preview/${encodedJob}/asset/${encoded}`
}
