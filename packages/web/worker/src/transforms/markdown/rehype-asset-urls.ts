import type { Root } from 'hast'
import { visit } from 'unist-util-visit'

export type AssetUrls = {
	urls: ReadonlyMap<string, string>
	warn: (destination: string) => void
}

export function rehypeAssetUrls(assets?: AssetUrls) {
	return (tree: Root) => {
		if (!assets) return

		visit(tree, 'element', (node) => {
			if (node.tagName !== 'img' && node.tagName !== 'a') return
			const property = node.tagName === 'img' ? 'src' : 'href'

			const destination = node.properties[property]
			if (typeof destination !== 'string' || !destination.startsWith('.assets/')) return

			const url = assets.urls.get(destination)
			if (url) {
				node.properties[property] = url
			} else {
				assets.warn(destination)
			}
		})
	}
}
