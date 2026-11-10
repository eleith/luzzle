import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { EditorState, StateField, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'
import { createEditorKeybindings } from './keybindings'

vi.mock('@replit/codemirror-vim', () => ({
	vim: vi.fn(),
	getCM: vi.fn(),
	Vim: { defineEx: vi.fn() }
}))

const activeVim = StateField.define({ create: () => true, update: (value) => value })
const storage = { getItem: vi.fn(), setItem: vi.fn() }

beforeEach(() => {
	vi.stubGlobal('window', { localStorage: storage })
	storage.getItem.mockReturnValue(null)
	vi.mocked(vim).mockReturnValue(activeVim)
})

afterEach(() => {
	vi.resetAllMocks()
	vi.unstubAllGlobals()
})

function setup() {
	const controller = createEditorKeybindings()
	let state = EditorState.create({
		doc: 'Notes',
		selection: { anchor: 1, head: 3 },
		extensions: controller.extension
	})
	const view = {
		get state() {
			return state
		},
		dispatch(spec: TransactionSpec) {
			state = state.update(spec).state
		}
	} as EditorView
	return { controller, view }
}

test('menu changes preserve the buffer and selection, and persist for the next editor', () => {
	storage.setItem.mockImplementation((_key, value) => storage.getItem.mockReturnValue(value))
	const { controller, view } = setup()
	const selection = view.state.selection
	expect(controller.enabled).toBe(false)

	controller.setEnabled(view, true)
	expect(controller.enabled).toBe(true)
	expect(view.state.field(activeVim)).toBe(true)
	expect(vim).toHaveBeenCalledWith({ status: false })
	expect(storage.setItem).toHaveBeenLastCalledWith('editor.keybindings', 'vim')
	const restored = setup()
	expect(restored.controller.enabled).toBe(true)
	expect(restored.view.state.field(activeVim)).toBe(true)

	controller.setEnabled(view, false)
	expect(controller.enabled).toBe(false)
	expect(view.state.field(activeVim, false)).toBeUndefined()
	expect(storage.setItem).toHaveBeenLastCalledWith('editor.keybindings', 'standard')
	expect(view.state.doc.toString()).toBe('Notes')
	expect(view.state.selection.eq(selection)).toBe(true)
})

test('unavailable browser storage does not prevent switching to Vim', () => {
	storage.getItem.mockImplementation(() => {
		throw new Error('Storage unavailable')
	})
	storage.setItem.mockImplementation(() => {
		throw new Error('Storage unavailable')
	})
	const { controller, view } = setup()
	expect(controller.enabled).toBe(false)
	controller.setEnabled(view, true)
	expect(view.state.field(activeVim)).toBe(true)
})
