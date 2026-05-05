import type { Extension } from '@codemirror/state'
import { yamlAssetWidget } from './yamlAssetWidget'
import iconSvg from '~icons/ph/arrow-circle-up-right?raw&width=20&height=20'

export function luzzleAssetEditor(assetFields: string[]): Extension {
	return yamlAssetWidget(iconSvg as unknown as string, assetFields, (assetUrl) => ({
		href: `/editor/asset/${assetUrl}`,
		title: `View ${assetUrl}`
	}))
}
