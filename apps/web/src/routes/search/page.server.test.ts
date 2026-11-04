import { beforeEach, expect, test, vi } from 'vitest'
import { db } from '#lib/server/database/index.js'
import { hydrateWithAssets } from '#lib/pieces/assets.server.js'
import { load } from './+page.server.js'

vi.mock('#lib/server/database/index.js', () => ({
	db: { selectFrom: vi.fn() },
	sql: vi.fn()
}))
vi.mock('#lib/pieces/assets.server.js', () => ({ hydrateWithAssets: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

test.each(['/search', '/search?query=&type=&after=&before=&page=2'])(
	'%s shows the entry form without querying or hydrating pieces',
	async (path) => {
		const event = { url: new URL(path, 'https://garden.test') } as Parameters<typeof load>[0]
		expect(await load(event)).toEqual({
			pieces: [],
			query: '',
			type: '',
			after: '',
			before: '',
			nextPage: null
		})
		expect(db.selectFrom).not.toHaveBeenCalled()
		expect(hydrateWithAssets).not.toHaveBeenCalled()
	}
)
