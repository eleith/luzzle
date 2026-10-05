import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { EditorState, StateField, type TransactionSpec } from '@codemirror/state'
import { EditorView, showPanel } from '@codemirror/view'
import { history, undo } from '@codemirror/commands'
import { getCM, Vim, vim } from '@replit/codemirror-vim'
import { editorKeybindings, finishVimInput } from './keybindings'
import { keybindingsStatus } from './keybindings-status'

vi.mock('@replit/codemirror-vim', () => ({
	vim: vi.fn(),
	getCM: vi.fn(),
	Vim: { handleKey: vi.fn() }
}))

const activeVim = StateField.define({ create: () => true, update: (value) => value })
const storage = { getItem: vi.fn(), setItem: vi.fn() }
let handlers: Parameters<typeof EditorView.domEventHandlers>[0]

beforeEach(() => {
	vi.stubGlobal('window', { localStorage: storage })
	storage.getItem.mockReturnValue(null)
	vi.mocked(vim).mockReturnValue(activeVim)
	vi.mocked(getCM).mockReturnValue(null)
	vi.spyOn(EditorView, 'domEventHandlers').mockImplementation((value) => {
		handlers = value
		return []
	})
})

afterEach(() => {
	vi.resetAllMocks()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

function setup() {
	const bindings = editorKeybindings()
	const keydown = handlers.keydown!
	let state = EditorState.create({
		doc: 'Notes',
		selection: { anchor: 1, head: 3 },
		extensions: [bindings, history()]
	})
	const view = {
		get state() {
			return state
		},
		dispatch(spec: TransactionSpec) {
			state = state.update(spec).state
		}
	} as EditorView
	return { view, keydown: (event: KeyboardEvent) => keydown.call(view, event, view) }
}

function shortcut(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
	return {
		key: 'v',
		ctrlKey: true,
		altKey: true,
		shiftKey: false,
		metaKey: false,
		isComposing: false,
		repeat: false,
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		...overrides
	} as unknown as KeyboardEvent
}

test.each([null, 'standard', 'invalid'])('defaults to Standard for preference %j', (preference) => {
	storage.getItem.mockReturnValue(preference)
	const { view } = setup()
	expect(storage.getItem).toHaveBeenCalledWith('editor.keybindings')
	expect(view.state.facet(showPanel)).toContain(keybindingsStatus)
	expect(view.state.field(activeVim, false)).toBeUndefined()
	expect(vim).not.toHaveBeenCalled()
})

test('restores Vim without the plugin’s separate status panel', () => {
	storage.getItem.mockReturnValue('vim')
	const { view } = setup()
	expect(view.state.field(activeVim)).toBe(true)
	expect(vim).toHaveBeenCalledExactlyOnceWith({ status: false })
})

test('Ctrl+Alt+V toggles and remembers the preference without changing text or selection', () => {
	const { view, keydown } = setup()
	const before = view.state.selection
	const event = shortcut()
	expect(keydown(event)).toBe(true)
	expect(event.preventDefault).toHaveBeenCalledOnce()
	expect(event.stopPropagation).toHaveBeenCalledOnce()
	expect(view.state.field(activeVim)).toBe(true)
	expect(storage.setItem).toHaveBeenLastCalledWith('editor.keybindings', 'vim')
	expect(view.state.doc.toString()).toBe('Notes')
	expect(view.state.selection.eq(before)).toBe(true)

	expect(keydown(shortcut())).toBe(true)
	expect(view.state.field(activeVim, false)).toBeUndefined()
	expect(storage.setItem).toHaveBeenLastCalledWith('editor.keybindings', 'standard')
	expect(view.state.facet(showPanel)).toContain(keybindingsStatus)
	expect(view.state.doc.toString()).toBe('Notes')
	expect(view.state.selection.eq(before)).toBe(true)
})

test('does not add history entries or discard prior editing history when toggled', () => {
	const { view, keydown } = setup()
	view.dispatch({ changes: { from: 5, insert: ' edited' } })
	keydown(shortcut())
	keydown(shortcut())
	expect(undo(view)).toBe(true)
	expect(view.state.doc.toString()).toBe('Notes')
})

test('restores the shared preference when opening another editor', () => {
	storage.setItem.mockImplementation((_key, value) => storage.getItem.mockReturnValue(value))
	setup().keydown(shortcut())
	expect(setup().view.state.field(activeVim)).toBe(true)
})

test.each([
	{ ctrlKey: false },
	{ altKey: false },
	{ shiftKey: true },
	{ metaKey: true },
	{ key: 'x' },
	{ isComposing: true }
])('leaves other key events alone: %j', (overrides) => {
	const { view, keydown } = setup()
	const event = shortcut(overrides)
	expect(keydown(event)).toBe(false)
	expect(event.preventDefault).not.toHaveBeenCalled()
	expect(view.state.field(activeVim, false)).toBeUndefined()
	expect(storage.setItem).not.toHaveBeenCalled()
})

test('does not toggle repeatedly while the shortcut is held down', () => {
	const { view, keydown } = setup()
	keydown(shortcut())
	expect(keydown(shortcut({ repeat: true }))).toBe(true)
	expect(view.state.field(activeVim)).toBe(true)
	expect(storage.setItem).toHaveBeenCalledTimes(1)
})

test('accepts Caps Lock without requiring Shift', () => {
	const { view, keydown } = setup()
	keydown(shortcut({ key: 'V' }))
	expect(view.state.field(activeVim)).toBe(true)
})

test('still edits and toggles when browser storage is unavailable', () => {
	storage.getItem.mockImplementation(() => {
		throw new Error('Storage unavailable')
	})
	storage.setItem.mockImplementation(() => {
		throw new Error('Storage unavailable')
	})
	const { view, keydown } = setup()
	expect(view.state.field(activeVim, false)).toBeUndefined()
	expect(() => keydown(shortcut())).not.toThrow()
	expect(view.state.field(activeVim)).toBe(true)
})

test('finishes the active Vim input operation before an external document replacement', () => {
	const { view } = setup()
	const editor = {} as NonNullable<ReturnType<typeof getCM>>
	vi.mocked(getCM).mockReturnValue(editor)
	finishVimInput(view)
	expect(getCM).toHaveBeenCalledExactlyOnceWith(view)
	expect(Vim.handleKey).toHaveBeenCalledExactlyOnceWith(editor, '<Esc>', 'api')
})

test('finishing Vim input is a no-op in Standard mode', () => {
	const { view } = setup()
	finishVimInput(view)
	expect(Vim.handleKey).not.toHaveBeenCalled()
})
