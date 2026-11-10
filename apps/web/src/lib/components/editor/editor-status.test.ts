import { afterEach, expect, test, vi } from 'vitest'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { getCM } from '@replit/codemirror-vim'
import { editorStatusPanel } from './editor-status'

vi.mock('@replit/codemirror-vim', () => ({ getCM: vi.fn() }))

afterEach(() => vi.resetAllMocks())

test('mode events update the panel without document edits and detach on disable or destroy', () => {
	const dom = { hidden: false, setAttribute: vi.fn(), append: vi.fn() }
	const modeLabel = { textContent: '', setAttribute: vi.fn() }
	const prompt = { hidden: true, append: vi.fn() }
	const createElement = vi
		.fn()
		.mockReturnValueOnce(dom)
		.mockReturnValueOnce(modeLabel)
		.mockReturnValueOnce(prompt)
	const view = { dom: { ownerDocument: { createElement } } } as unknown as EditorView
	const events = new EventTarget()
	const state = { vim: { insertMode: false } }
	const off = vi.fn((event: string, handler: () => void) =>
		events.removeEventListener(event, handler)
	)
	const adapter = {
		state,
		on: (event: string, handler: () => void) => events.addEventListener(event, handler),
		off
	} as unknown as NonNullable<ReturnType<typeof getCM>>
	vi.mocked(getCM).mockReturnValue(adapter)
	const panel = editorStatusPanel(view)
	expect(modeLabel.textContent).toBe('Normal')

	state.vim.insertMode = true
	events.dispatchEvent(new Event('vim-mode-change'))
	expect(modeLabel.textContent).toBe('Insert')

	vi.mocked(getCM).mockReturnValue(null)
	panel.update?.({} as ViewUpdate)
	expect(off).toHaveBeenCalledWith('vim-mode-change', expect.any(Function))
	state.vim.insertMode = false
	events.dispatchEvent(new Event('vim-mode-change'))
	expect(modeLabel.textContent).toBe('')

	vi.mocked(getCM).mockReturnValue(adapter)
	panel.update?.({} as ViewUpdate)
	expect(modeLabel.textContent).toBe('Normal')
	panel.destroy?.()
	state.vim.insertMode = true
	events.dispatchEvent(new Event('vim-mode-change'))
	expect(modeLabel.textContent).toBe('Normal')
})
