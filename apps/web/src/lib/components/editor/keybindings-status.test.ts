import { afterEach, expect, test, vi } from 'vitest'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { getCM } from '@replit/codemirror-vim'
import { keybindingsStatus } from './keybindings-status'

vi.mock('@replit/codemirror-vim', () => ({ getCM: vi.fn() }))

afterEach(() => vi.resetAllMocks())

function element() {
	let text = ''
	const writes = vi.fn()
	return {
		className: '',
		setAttribute: vi.fn(),
		append: vi.fn(),
		writes,
		get textContent() {
			return text
		},
		set textContent(value: string) {
			text = value
			writes(value)
		}
	}
}

function setup() {
	const dom = element()
	const label = element()
	const modeLabel = element()
	const createElement = vi
		.fn()
		.mockReturnValueOnce(dom)
		.mockReturnValueOnce(label)
		.mockReturnValueOnce(modeLabel)
	const focus = vi.fn()
	const view = {
		dom: { ownerDocument: { createElement } },
		hasFocus: false,
		focus
	} as unknown as EditorView
	const panel = keybindingsStatus(view)
	return { panel, dom, label, modeLabel, createElement, focus }
}

function vimEditor() {
	const events = new EventTarget()
	const state = {
		vim: { insertMode: false, visualMode: false, visualLine: false, visualBlock: false },
		overwrite: false
	}
	const adapter = {
		state,
		on: vi.fn((event: string, handler: () => void) => events.addEventListener(event, handler)),
		off: vi.fn((event: string, handler: () => void) => events.removeEventListener(event, handler))
	}
	return {
		adapter: adapter as unknown as NonNullable<ReturnType<typeof getCM>>,
		state,
		on: adapter.on,
		off: adapter.off,
		modeChanged: () => events.dispatchEvent(new Event('vim-mode-change'))
	}
}

test('renders a bottom informational footer in Standard mode with no focusable controls', () => {
	vi.mocked(getCM).mockReturnValue(null)
	const { panel, dom, label, modeLabel, createElement, focus } = setup()
	expect(panel.top).toBe(false)
	expect(panel.dom).toBe(dom)
	expect(dom.className).toBe('editor-status')
	expect(dom.setAttribute).toHaveBeenCalledWith('aria-label', 'Editor keybindings')
	expect(label.setAttribute).toHaveBeenCalledWith('role', 'status')
	expect(label.textContent).toBe('Standard (Ctrl+Alt+V)')
	expect(modeLabel.textContent).toBe('')
	expect(modeLabel.setAttribute).toHaveBeenCalledWith('role', 'status')
	expect(createElement.mock.calls).toEqual([['div'], ['span'], ['span']])
	expect(dom.append).toHaveBeenCalledWith(label, modeLabel)
	panel.update?.({ focusChanged: true } as ViewUpdate)
	panel.destroy?.()
	expect(focus).not.toHaveBeenCalled()
})

test.each([
	['Normal', {}],
	['Insert', { insertMode: true }],
	['Visual', { visualMode: true }],
	['Visual line', { visualMode: true, visualLine: true }],
	['Visual block', { visualMode: true, visualBlock: true }]
])('shows the actual initial Vim mode: %s', (mode, flags) => {
	const editor = vimEditor()
	Object.assign(editor.state.vim, flags)
	vi.mocked(getCM).mockReturnValue(editor.adapter)
	const { dom, label, modeLabel } = setup()
	expect(label.textContent).toBe('Vim (Ctrl+Alt+V)')
	expect(modeLabel.textContent).toBe(mode)
	expect(dom.append).toHaveBeenCalledWith(label, modeLabel)
})

test('updates from mode events even when there is no document transaction', () => {
	const editor = vimEditor()
	vi.mocked(getCM).mockReturnValue(editor.adapter)
	const { panel, modeLabel, focus } = setup()
	const listener = editor.on.mock.calls[0][1]
	expect(editor.on).toHaveBeenCalledExactlyOnceWith('vim-mode-change', listener)
	editor.state.vim.insertMode = true
	editor.modeChanged()
	expect(modeLabel.textContent).toBe('Insert')
	editor.state.overwrite = true
	editor.modeChanged()
	expect(modeLabel.textContent).toBe('Replace')
	editor.state.vim.insertMode = false
	editor.state.overwrite = false
	editor.modeChanged()
	expect(modeLabel.textContent).toBe('Normal')
	panel.update?.({ focusChanged: true } as ViewUpdate)
	expect(modeLabel.textContent).toBe('Normal')
	expect(focus).not.toHaveBeenCalled()
})

test('tracks enable/disable and a replacement Vim instance without leaking listeners', () => {
	vi.mocked(getCM).mockReturnValue(null)
	const { panel, label, modeLabel } = setup()
	const first = vimEditor()
	vi.mocked(getCM).mockReturnValue(first.adapter)
	panel.update?.({} as ViewUpdate)
	expect(label.textContent).toBe('Vim (Ctrl+Alt+V)')
	expect(modeLabel.textContent).toBe('Normal')
	const firstListener = first.on.mock.calls[0][1]

	vi.mocked(getCM).mockReturnValue(null)
	panel.update?.({} as ViewUpdate)
	expect(first.off).toHaveBeenCalledExactlyOnceWith('vim-mode-change', firstListener)
	expect(label.textContent).toBe('Standard (Ctrl+Alt+V)')
	expect(modeLabel.textContent).toBe('')
	first.state.vim.insertMode = true
	first.modeChanged()
	expect(label.textContent).toBe('Standard (Ctrl+Alt+V)')
	expect(modeLabel.textContent).toBe('')

	const second = vimEditor()
	vi.mocked(getCM).mockReturnValue(second.adapter)
	panel.update?.({} as ViewUpdate)
	const secondListener = second.on.mock.calls[0][1]
	panel.destroy?.()
	expect(second.off).toHaveBeenCalledExactlyOnceWith('vim-mode-change', secondListener)
	second.state.vim.insertMode = true
	second.modeChanged()
	expect(label.textContent).toBe('Vim (Ctrl+Alt+V)')
	expect(modeLabel.textContent).toBe('Normal')
})

test('does not rewrite the live status for every cursor or focus update', () => {
	const editor = vimEditor()
	vi.mocked(getCM).mockReturnValue(editor.adapter)
	const { panel, label, modeLabel } = setup()
	panel.update?.({ selectionSet: true } as ViewUpdate)
	panel.update?.({ focusChanged: true } as ViewUpdate)
	editor.modeChanged()
	expect(label.writes).toHaveBeenCalledOnce()
	expect(modeLabel.writes).toHaveBeenCalledOnce()
	expect(editor.on).toHaveBeenCalledOnce()
})

test('does not report Vim from a stale adapter without active Vim state', () => {
	const editor = vimEditor()
	delete (editor.state as { vim?: unknown }).vim
	vi.mocked(getCM).mockReturnValue(editor.adapter)
	const { label, modeLabel } = setup()
	expect(label.textContent).toBe('Standard (Ctrl+Alt+V)')
	expect(modeLabel.textContent).toBe('')
})
