import type { EditorState } from '@codemirror/state'
import { isolateHistory } from '@codemirror/commands'

export function replaceDocument(state: EditorState, content: string, expectedSource: string) {
	if (state.doc.toString() !== expectedSource) {
		throw new Error(
			'The editor changed during generation. Nothing was applied; try again with the current content.'
		)
	}
	return state.update({
		changes: { from: 0, to: state.doc.length, insert: content },
		selection: { anchor: 0 },
		annotations: isolateHistory.of('full')
	})
}
