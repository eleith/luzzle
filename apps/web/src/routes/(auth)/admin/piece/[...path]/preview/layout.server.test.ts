import { expect, test, vi } from 'vitest'
import { load } from './+layout.server'
import { db } from '#lib/server/database/index.js'
import { getWebPiece } from '#lib/server/pieces.js'

vi.mock('#lib/server/database/index.js', () => ({ db: {} }))
vi.mock('#lib/server/pieces.js', () => ({ getWebPiece: vi.fn() }))

test('the preview layout supplies publication availability and inlines configured CSS', async () => {
	const inlineConfiguredStyles = vi.fn()
	vi.mocked(getWebPiece).mockResolvedValue(undefined)
	const file = 'books/example.books.md'
	const event = {
		params: { path: file },
		locals: { inlineConfiguredStyles }
	} as unknown as Parameters<typeof load>[0]

	expect(await load(event)).toEqual({ hasPublishedVersion: false })
	expect(getWebPiece).toHaveBeenCalledExactlyOnceWith(db, file)
	expect(inlineConfiguredStyles).toHaveBeenCalledExactlyOnceWith()

	const foundRow: NonNullable<Awaited<ReturnType<typeof getWebPiece>>> = {
		id: 'published-id',
		key: 'published-key',
		file_path: file,
		title: 'Published title',
		type: 'books',
		slug: 'example',
		date_added: 10,
		date_updated: 20,
		json_metadata: '{}',
		content_hash: 'published-hash',
		last_published_at: 1234
	}
	vi.mocked(getWebPiece).mockResolvedValue(foundRow)

	expect(await load(event)).toEqual({ hasPublishedVersion: true })
	expect(getWebPiece).toHaveBeenLastCalledWith(db, file)
	expect(inlineConfiguredStyles).toHaveBeenCalledTimes(2)
})
