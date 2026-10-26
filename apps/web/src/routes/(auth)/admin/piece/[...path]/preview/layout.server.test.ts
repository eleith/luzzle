import { expect, test, vi } from 'vitest'
import { load } from './+layout.server'

test('the preview layout requests configured CSS without returning it as page data', async () => {
	const inlineConfiguredStyles = vi.fn()
	expect(
		await load({ locals: { inlineConfiguredStyles } } as unknown as Parameters<typeof load>[0])
	).toEqual({})
	expect(inlineConfiguredStyles).toHaveBeenCalledExactlyOnceWith()
})
