import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import PieceActions from './PieceActions.svelte'

// SSR covers the trigger, not portal actions, client selection or focus.
test.each([false, true])('More is labeled and disabled=%s while saving', (disabled) => {
	const { body } = render(PieceActions, {
		props: {
			canGenerate: true,
			disabled,
			hasPublishedVersion: true,
			unpublishDisabled: disabled,
			onUnpublish: vi.fn(),
			onDelete: vi.fn(),
			onAttach: vi.fn(),
			onGenerate: vi.fn()
		}
	})
	const trigger = body.match(/<button\b[^>]*aria-haspopup="menu"[^>]*>/)?.[0]
	expect(trigger).toBeDefined()
	expect(trigger).toContain('data-variant="editor"')
	expect(trigger).toContain('type="button"')
	expect(trigger).toContain('aria-expanded="false"')
	expect(body).toContain('More')
	if (disabled) expect(trigger).toMatch(/\sdisabled(?:\s|=|>)/)
	else expect(trigger).not.toMatch(/\sdisabled(?:\s|=|>)/)
})
