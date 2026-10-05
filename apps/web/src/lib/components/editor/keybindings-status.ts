import type { EditorView, Panel } from '@codemirror/view'
import { getCM } from '@replit/codemirror-vim'

/** An informational footer; keybinding changes still belong to the shortcut. */
export function keybindingsStatus(view: EditorView): Panel {
	const document = view.dom.ownerDocument
	const dom = document.createElement('div')
	dom.className = 'editor-status'
	dom.setAttribute('role', 'group')
	dom.setAttribute('aria-label', 'Editor keybindings')
	const label = document.createElement('span')
	label.setAttribute('role', 'status')
	const modeLabel = document.createElement('span')
	modeLabel.setAttribute('role', 'status')
	dom.append(label, modeLabel)

	let editor: ReturnType<typeof getCM> = null

	function render() {
		const state = editor?.state.vim
		const text = `${state ? 'Vim' : 'Standard'} (Ctrl+Alt+V)`
		let mode = ''
		if (state) {
			mode = 'Normal'
			if (state.visualMode) {
				mode = 'Visual'
				if (state.visualBlock) mode = 'Visual block'
				else if (state.visualLine) mode = 'Visual line'
			} else if (state.insertMode) {
				mode = editor?.state.overwrite ? 'Replace' : 'Insert'
			}
		}
		// Cursor movements and focus updates must not repeatedly announce the same mode.
		if (label.textContent !== text) label.textContent = text
		if (modeLabel.textContent !== mode) modeLabel.textContent = mode
	}

	function update() {
		const current = getCM(view)
		if (current !== editor) {
			editor?.off('vim-mode-change', render)
			editor = current
			editor?.on('vim-mode-change', render)
		}
		render()
	}

	update()
	return {
		dom,
		top: false,
		update,
		destroy() {
			editor?.off('vim-mode-change', render)
		}
	}
}
