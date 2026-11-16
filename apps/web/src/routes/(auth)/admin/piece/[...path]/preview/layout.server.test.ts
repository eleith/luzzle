import { expect, test, vi } from 'vitest'
import { load } from './+layout.server'

test('the preview creation layout inlines configured CSS', async () => {
	const inlineConfiguredStyles = vi.fn()
	const event = {
		params: { path: 'books/example.books.md' },
		locals: { inlineConfiguredStyles }
	} as unknown as Parameters<typeof load>[0]

	await load(event)

	expect(inlineConfiguredStyles).toHaveBeenCalledExactlyOnceWith()
})
