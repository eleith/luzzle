import { Compartment, type Extension } from '@codemirror/state'
import { showPanel, ViewPlugin, type EditorView } from '@codemirror/view'
import { getCM, Vim, vim, type CodeMirrorV } from '@replit/codemirror-vim'
import { editorStatusPanel, type StatusContentRenderer } from './editor-status'

const preferenceKey = 'editor.keybindings'
const saveHandlers = new WeakMap<EditorView, () => void>()

function saveFromVim(editor: CodeMirrorV) {
	saveHandlers.get(editor.cm6)?.()
}

Vim.defineEx('write', 'w', saveFromVim)
Vim.defineEx('wq', 'wq', saveFromVim)

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

export function createEditorKeybindings(renderStatus?: StatusContentRenderer, onSave?: () => void) {
	const keybindings = new Compartment()
	let enabled = readPreference()

	function setEnabled(view: EditorView, next: boolean) {
		if (enabled === next) return
		enabled = next
		view.dispatch({
			effects: keybindings.reconfigure(enabled ? vim({ status: false }) : [])
		})
		savePreference(enabled)
	}

	const extension: Extension[] = [
		keybindings.of(enabled ? vim({ status: false }) : []),
		showPanel.of((view) => editorStatusPanel(view, renderStatus))
	]
	if (onSave) {
		extension.push(
			ViewPlugin.define((view) => {
				saveHandlers.set(view, onSave)
				return {
					destroy() {
						saveHandlers.delete(view)
					}
				}
			})
		)
	}

	return {
		extension,
		get enabled() {
			return enabled
		},
		setEnabled
	}
}

export function editorKeybindings(onSave?: () => void): Extension {
	return createEditorKeybindings(undefined, onSave).extension
}

/** Finish Vim's insertion before applying a generated document, outside dot-repeat. */
export function finishVimInput(view: EditorView) {
	const editor = getCM(view)
	if (editor) Vim.handleKey(editor, '<Esc>', 'api')
}
