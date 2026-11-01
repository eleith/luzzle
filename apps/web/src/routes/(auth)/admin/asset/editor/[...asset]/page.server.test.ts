import { beforeEach, expect, test, vi } from 'vitest'
import { getStorage } from '#lib/server/storage.js'
import { actions, load } from './+page.server'

vi.mock('#lib/server/storage.js', () => ({ getStorage: vi.fn() }))

const origin = 'https://app.test:9443'
const file = 'images/cover.jpg'
const local = '/admin/piece/books/literal%252F%20%23%3F%25.md/source?view=a%26b#outputs'
const destinations = [
	[null, '/admin'],
	[local, local],
	[`/garden${local}`, `/garden${local}`],
	[`${origin}${local}`, local],
	['https://external.test/admin', '/admin'],
	['//external.test/admin', '/admin'],
	['/\\external.test/admin', '/admin'],
	['javascript:alert(1)', '/admin'],
	['/admin/..//external.test/admin', '/admin']
] as const
const storage = { exists: vi.fn(), delete: vi.fn() }

beforeEach(() => {
	vi.resetAllMocks()
	vi.mocked(getStorage).mockReturnValue(storage as unknown as ReturnType<typeof getStorage>)
})

function event(returnTo: string | null) {
	const url = new URL(`/admin/asset/editor/${file}`, origin)
	if (returnTo !== null) url.searchParams.set('returnTo', returnTo)
	return { params: { asset: file }, url }
}

test.each(destinations)('Back receives a local destination for %j', async (value, expected) => {
	storage.exists.mockResolvedValue(false)
	expect(await load(event(value) as Parameters<typeof load>[0])).toMatchObject({
		returnTo: expected,
		exists: false
	})
})

test.each(destinations)('Delete redirects locally for %j', async (value, expected) => {
	storage.exists.mockResolvedValue(true)
	await expect(
		actions.delete(event(value) as Parameters<typeof actions.delete>[0])
	).rejects.toMatchObject({ status: 303, location: expected })
	expect(storage.delete).toHaveBeenCalledExactlyOnceWith(file)
})

test('a failed delete still returns the action failure instead of redirecting', async () => {
	storage.exists.mockResolvedValue(true)
	storage.delete.mockRejectedValue(new Error('Delete failed'))
	expect(await actions.delete(event(local) as Parameters<typeof actions.delete>[0])).toMatchObject({
		status: 500,
		data: { error: { message: 'Failed to delete asset: Delete failed' } }
	})
})
