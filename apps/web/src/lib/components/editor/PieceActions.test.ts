import { readFileSync } from 'node:fs'
import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import PieceActions from './PieceActions.svelte'

vi.mock('$app/navigation', () => ({ goto: vi.fn() }))
const source = readFileSync(new URL('./PieceActions.svelte', import.meta.url), 'utf8')

// SSR covers only the trigger; portal actions below are source contracts,
// not evidence of client selection, keyboard handling or focus behavior.
test('SSR names the actions trigger', () => {
	const { body } = render(PieceActions, {
		props: {
			file: 'books/a #?.md',
			currentMode: 'source',
			canGenerate: true,
			canPublish: true,
			onDelete: vi.fn(),
			onAttach: vi.fn(),
			onGenerate: vi.fn()
		}
	})
	expect(body).toMatch(/<button[^>]*aria-label="Piece actions"[^>]*aria-haspopup="menu"/)
})

test('preserves action gates and callbacks, with encoded generate fallback and no legacy views', () => {
	expect(source).toContain('{#if canPublish}')
	expect(source).toContain("onSelect={() => goto('/admin/publish?check=1')}")
	expect(source).toContain('{#if canGenerate}')
	expect(source).toContain("if (currentMode === 'source' && onGenerate) onGenerate()")
	expect(source).toContain("else goto(editorHref(file) + '?generate=1')")
	expect(source).toContain("{#if currentMode === 'source' && onAttach}")
	expect(source).toContain('onSelect={onAttach}')
	expect(source).toContain('onSelect={onDelete}')
	expect(source).not.toMatch(
		/isDirty|hasPublicVersion|isPublicStale|previewUrl|liveUrl|href=|>preview<|>live</
	)
})
