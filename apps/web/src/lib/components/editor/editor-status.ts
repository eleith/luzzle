import type { EditorView, Panel } from '@codemirror/view'
import { getCM } from '@replit/codemirror-vim'

export type StatusContentRenderer = (target: HTMLElement) => () => void

export function editorStatusPanel(view: EditorView, renderContent?: StatusContentRenderer): Panel {
	const document = view.dom.ownerDocument
	const dom = document.createElement('div')
	dom.className = 'editor-status'
	dom.setAttribute('role', 'group')
	dom.setAttribute('aria-label', 'Editor status')
	const modeLabel = document.createElement('span')
	modeLabel.className = 'editor-status-mode'
	modeLabel.setAttribute('role', 'status')
	dom.append(modeLabel)
	const prompt = document.createElement('span')
	prompt.className = 'editor-vim-status cm-vim-panel'
	prompt.hidden = true
	dom.append(prompt)
	let content: HTMLElement | undefined
	let destroyContent: (() => void) | undefined
	if (renderContent) {
		content = document.createElement('span')
		content.className = 'editor-status-content'
		dom.append(content)
		destroyContent = renderContent(content)
	}

	let editor: ReturnType<typeof getCM> = null
	let previousStatusbar: Element | null | undefined

	function render() {
		const state = editor?.state.vim
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
		// Cursor movements and focus updates must not repeatedly announce unchanged status.
		if (modeLabel.textContent !== mode) modeLabel.textContent = mode
		const dialog = editor?.state.dialog
		const showingPrompt = !!dialog
		if (dialog && dialog.parentElement !== prompt) prompt.append(dialog)
		prompt.hidden = !showingPrompt
		modeLabel.hidden = showingPrompt || !mode
		if (content) content.hidden = showingPrompt
		dom.setAttribute('data-vim-dialog', String(showingPrompt))
		dom.hidden = !showingPrompt && !mode && !renderContent
	}

	function detachEditor() {
		editor?.off('vim-mode-change', render)
		editor?.off('dialog', render)
		if (editor && editor.state.statusbar === prompt) {
			editor.state.statusbar = previousStatusbar
		}
	}

	function update() {
		const current = getCM(view)
		if (current !== editor) {
			detachEditor()
			editor = current
			previousStatusbar = editor?.state.statusbar
			if (editor) {
				// Give Vim a host in our panel so prompts do not create a second bottom row.
				editor.state.statusbar = prompt
				editor.on('vim-mode-change', render)
				editor.on('dialog', render)
			}
		}
		render()
	}

	update()
	return {
		dom,
		top: false,
		update,
		destroy() {
			detachEditor()
			destroyContent?.()
		}
	}
}
