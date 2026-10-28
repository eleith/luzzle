import { expect, test } from 'vitest'
import { reconcileSave, reconcileSourceRefresh } from './save-state'

const file = 'a.note.md'
const submitted = { file, content: 'A' }
const saved = { type: 'success' as const, content: 'A\n' }

test('an unchanged submitted buffer adopts normalized source and is saved', () => {
	const content = reconcileSave(submitted, submitted, saved)
	expect(content).toBe('A\n')
	expect(content === saved.content).toBe(true)
})

test('typing B during Save A preserves B against the refreshed A baseline', () => {
	const content = reconcileSave({ file, content: 'B' }, submitted, saved)
	expect(content).toBe('B')
	expect(content !== saved.content).toBe(true)

	// The retained draft can be submitted next, then adopt its own normalization.
	const nextSubmission = { file, content }
	const nextSaved = { type: 'success' as const, content: 'B\n' }
	const nextContent = reconcileSave(nextSubmission, nextSubmission, nextSaved)
	expect(nextContent).toBe('B\n')
	expect(nextContent === nextSaved.content).toBe(true)
})

test('a failed Save echoing A does not replace newer B or mark it saved', () => {
	const baseline = 'original source'
	const content = reconcileSave({ file, content: 'B' }, submitted, {
		type: 'failure',
		content: 'A'
	})
	expect(content).toBe('B')
	expect(content !== baseline).toBe(true)
})

test('failure preserves an unchanged submitted draft too', () => {
	expect(reconcileSave(submitted, submitted, { type: 'failure', content: 'error A' })).toBe('A')
	expect(reconcileSave(submitted, submitted, { type: 'failure' })).toBe('A')
})

test('clearing the buffer while Save is pending remains an unsaved edit', () => {
	const content = reconcileSave({ file, content: '' }, submitted, saved)
	expect(content).toBe('')
	expect(content !== saved.content).toBe(true)
})

test('an old file response cannot replace the newly loaded file, even with identical text', () => {
	const current = { file: 'other.note.md', content: 'A' }
	expect(reconcileSave(current, submitted, saved)).toBe(current.content)
	expect(reconcileSave(current, submitted, { type: 'failure', content: 'error A' })).toBe(
		current.content
	)
})

test('pristine same-file refreshes adopt each new saved baseline', () => {
	const refreshed = { file, content: 'B' }
	const content = reconcileSourceRefresh('A', submitted, refreshed, false)
	expect(content).toBe('B')
	expect(content).toBe(refreshed.content)

	const nextRefresh = { file, content: 'C' }
	expect(reconcileSourceRefresh(content, refreshed, nextRefresh, false)).toBe('C')
})

test('same-file refreshes preserve dirty drafts against the latest loaded baseline', () => {
	const refreshed = { file, content: 'B' }
	const content = reconcileSourceRefresh('draft', submitted, refreshed, false)
	expect(content).toBe('draft')
	expect(content).not.toBe(refreshed.content)

	// Returning to historical A is still dirty against the now-loaded B baseline.
	const nextRefresh = { file, content: 'C' }
	expect(reconcileSourceRefresh('A', refreshed, nextRefresh, false)).toBe('A')
})

test('a pending Save defers even a pristine buffer refresh to save reconciliation', () => {
	const refreshed = { file, content: saved.content }
	const content = reconcileSourceRefresh('A', submitted, refreshed, true)
	expect(content).toBe('A')
	expect(reconcileSave({ file, content }, submitted, saved)).toBe(refreshed.content)
})

test('typing B survives refresh during Save A and either save outcome', () => {
	const refreshed = { file, content: saved.content }
	const content = reconcileSourceRefresh('B', submitted, refreshed, true)
	expect(content).toBe('B')
	expect(reconcileSave({ file, content }, submitted, saved)).toBe('B')
	expect(reconcileSave({ file, content }, submitted, { type: 'failure', content: 'A' })).toBe('B')
	expect(content).not.toBe(refreshed.content)
})

test('navigation always loads the new file despite a dirty buffer or pending Save', () => {
	const refreshed = { file: 'other.note.md', content: 'other source' }
	expect(reconcileSourceRefresh('draft', submitted, refreshed, false)).toBe('other source')
	const content = reconcileSourceRefresh('draft', submitted, refreshed, true)
	expect(content).toBe('other source')
	expect(reconcileSave({ file: refreshed.file, content }, submitted, saved)).toBe(content)
})
