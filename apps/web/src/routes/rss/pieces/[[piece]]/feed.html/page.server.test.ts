import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server'

const { config, getPiecesForFeed } = vi.hoisted(() => ({
	config: { pieces: [{ type: 'field-notes' }, { type: 'specimens' }] },
	getPiecesForFeed: vi.fn()
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/feeds/utils', () => ({ getPiecesForFeed }))

function event(type?: string) {
	return { params: { piece: type } } as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	getPiecesForFeed.mockResolvedValue([{ id: 'note' }])
})

test.each(config.pieces.map(({ type }) => type))(
	'HTML feeds accept runtime-configured %s and retain metadata',
	async (type) => {
		expect(await load(event(type))).toEqual({
			pieces: [{ id: 'note' }],
			type,
			meta: { title: `RSS feed | ${type}`, description: `an RSS feed for ${type}` }
		})
		expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith(type)
	}
)

test('omitting the optional type retains the all-pieces feed', async () => {
	expect(await load(event())).toEqual({
		pieces: [{ id: 'note' }],
		type: undefined,
		meta: { title: 'RSS feed | all', description: 'RSS feed for all pieces' }
	})
	expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith(undefined)
})

test('unknown types fail before collecting feed pieces', async () => {
	await expect(load(event('unconfigured'))).rejects.toMatchObject({ status: 404 })
	expect(getPiecesForFeed).not.toHaveBeenCalled()
})
