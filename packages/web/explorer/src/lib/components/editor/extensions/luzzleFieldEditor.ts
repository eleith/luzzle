import type { Extension } from '@codemirror/state'
import { yamlKeyWidget } from './yamlKeyWidget'
import editIconSvg from '~icons/ph/pencil-simple?raw&width=20&height=20'

export interface FieldEditorOptions {
	file: string
	returnTo: string
}

export function luzzleFieldEditor({ file, returnTo }: FieldEditorOptions): Extension {
	return yamlKeyWidget(editIconSvg as unknown as string, (path) => ({
		href: `/admin/pieces/field/${file}?path=${encodeURIComponent(path)}&returnTo=${encodeURIComponent(returnTo)}`,
		title: `Edit field: ${path}`
	}))
}
