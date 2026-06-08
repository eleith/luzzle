import type { Extension } from '@codemirror/state'
import { yamlAssetWidget } from './yamlAssetWidget'
import iconSvg from 'virtual:icons/ph/pencil-simple?raw&width=20&height=20'
import { backLinkConfig } from './backLinkConfig'

export function luzzleAssetEditor(assetFields: string[]): Extension {
	return yamlAssetWidget(iconSvg as unknown as string, assetFields, (assetUrl, view) => {
		let href = `/admin/asset/editor/${assetUrl}`
		const returnTo = view.state.facet(backLinkConfig)
		if (returnTo) {
			href += `?returnTo=${encodeURIComponent(returnTo)}`
		}
		return {
			href,
			title: `Edit ${assetUrl}`
		}
	})
}
