import { expect, test } from 'vitest'
import { EditorState, Transaction } from '@codemirror/state'
import { history, undo, redo } from '@codemirror/commands'
import { replaceDocument } from './replace-document'

test('generation replaces the document as one undoable edit, separate from surrounding typing', () => {
	let state = EditorState.create({ doc: '---\ntitle: Before\n---\nNotes', extensions: [history()] })
	state = state.update({
		changes: { from: state.doc.length, insert: ' typed' },
		selection: { anchor: 5 },
		annotations: Transaction.userEvent.of('input.type')
	}).state
	const before = state.doc.toString()
	const selection = state.selection
	const generated = '---\ntitle: After\ncover: https://example.test/image.png\n---\nNotes typed'
	state = replaceDocument(state, generated, before).state
	expect(state.doc.toString()).toBe(generated)
	expect(state.selection.main.head).toBe(0)
	const target = {
		get state() {
			return state
		},
		dispatch: (transaction: Transaction) => {
			state = transaction.state
		}
	}
	expect(undo(target)).toBe(true)
	expect(state.doc.toString()).toBe(before)
	expect(state.selection.eq(selection)).toBe(true)
	expect(redo(target)).toBe(true)
	expect(state.doc.toString()).toBe(generated)

	state = state.update({
		changes: { from: state.doc.length, insert: ' later' },
		annotations: Transaction.userEvent.of('input.type')
	}).state
	expect(undo(target)).toBe(true)
	expect(state.doc.toString()).toBe(generated)
	expect(undo(target)).toBe(true)
	expect(state.doc.toString()).toBe(before)
})

test('a changed editor is left untouched instead of applying a stale generated document', () => {
	const state = EditorState.create({ doc: 'new unsaved edits', extensions: [history()] })
	expect(() => replaceDocument(state, 'generated replacement', 'earlier source')).toThrow(
		'editor changed'
	)
	expect(state.doc.toString()).toBe('new unsaved edits')
})
