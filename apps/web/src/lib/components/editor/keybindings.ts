import { Compartment, Prec, type Extension } from '@codemirror/state'
import { EditorView, showPanel } from '@codemirror/view'
import { getCM, Vim, vim } from '@replit/codemirror-vim'
import { keybindingsStatus } from './keybindings-status'

const preferenceKey = 'editor.keybindings'

function readPreference(): boolean {
	try {
		return window.localStorage.getItem(preferenceKey) === 'vim'
	} catch {
		return false
	}
}

function savePreference(enabled: boolean) {
	try {
		window.localStorage.setItem(preferenceKey, enabled ? 'vim' : 'standard')
	} catch {
		// The current editor still switches if browser storage is unavailable.
	}
}

/** Create once per editor, before its ordinary keymaps. */
export function editorKeybindings(): Extension {
	const keybindings = new Compartment()
	let enabled = readPreference()
	return [
		Prec.highest(
			EditorView.domEventHandlers({
				keydown(event, view) {
					if (
						!event.ctrlKey ||
						!event.altKey ||
						event.shiftKey ||
						event.metaKey ||
						event.isComposing ||
						event.key.toLowerCase() !== 'v'
					)
						return false
					event.preventDefault()
					event.stopPropagation()
					if (event.repeat) return true
					enabled = !enabled
					view.dispatch({
						effects: keybindings.reconfigure(enabled ? vim({ status: false }) : [])
					})
					savePreference(enabled)
					return true
				}
			})
		),
		keybindings.of(enabled ? vim({ status: false }) : []),
		showPanel.of(keybindingsStatus)
	]
}

/** Finish Vim's insertion before applying a generated document, outside dot-repeat. */
export function finishVimInput(view: EditorView) {
	const editor = getCM(view)
	if (editor) Vim.handleKey(editor, '<Esc>', 'api')
}
