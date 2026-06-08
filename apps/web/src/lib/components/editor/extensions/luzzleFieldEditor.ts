import type { Extension } from '@codemirror/state'

export interface FieldEditorOptions {
	file: string
	returnTo: string
}

export function luzzleFieldEditor({
	file: _file,
	returnTo: _returnTo
}: FieldEditorOptions): Extension {
	return []
}
