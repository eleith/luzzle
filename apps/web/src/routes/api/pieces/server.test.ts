import { beforeEach, expect, test, vi } from 'vitest'
import { GET } from './+server'

const { config, selectFrom, query, hydrateWithAssets, sql } = vi.hoisted(() => ({
	config: { pieces: [{ type: 'field-notes' }, { type: 'specimens' }] },
	selectFrom: vi.fn(),
	query: {
		selectAll: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		execute: vi.fn()
	},
	hydrateWithAssets: vi.fn(),
	sql: vi.fn()
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/server/database', () => ({ db: { selectFrom }, sql }))
vi.mock('$lib/pieces/assets.server', () => ({ hydrateWithAssets }))

function event(search = '') {
	return {
		request: new Request(`https://app.example/api/pieces${search}`)
	} as Parameters<typeof GET>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	selectFrom.mockReturnValue(query)
	query.execute.mockResolvedValue([{ id: 'note' }])
	hydrateWithAssets.mockImplementation(async (pieces) => pieces)
})

test.each(config.pieces.map(({ type }) => type))(
	'accepts runtime-configured %s with hydration and existing ordering',
	async (type) => {
		const response = await GET(event(`?type=${type}`))
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			pieces: [{ id: 'note' }],
			prevPage: null,
			nextPage: null
		})
		expect(query.where).toHaveBeenCalledExactlyOnceWith('web_pieces.type', '=', type)
		expect(query.orderBy.mock.calls).toEqual([
			['date_consumed', 'desc'],
			['date_added', 'desc']
		])
		expect(hydrateWithAssets).toHaveBeenCalledExactlyOnceWith([{ id: 'note' }])
	}
)

test.each(['', '?type='])('absent or empty type still lists all pieces (%s)', async (search) => {
	const response = await GET(event(search))
	expect(response.status).toBe(200)
	expect(query.where).not.toHaveBeenCalled()
	expect(hydrateWithAssets).toHaveBeenCalledOnce()
})

test('unknown explicit types retain 400 and fail before queries or hydration', async () => {
	const response = await GET(event('?type=unconfigured'))
	expect(response.status).toBe(400)
	expect(await response.text()).toBe('invalid type')
	expect(selectFrom).not.toHaveBeenCalled()
	expect(hydrateWithAssets).not.toHaveBeenCalled()
})

test('page and take retain their existing pagination semantics', async () => {
	query.execute.mockResolvedValue([{ id: 'one' }, { id: 'two' }, { id: 'extra' }])
	const response = await GET(event('?page=2&take=2'))
	expect(await response.json()).toEqual({
		pieces: [{ id: 'one' }, { id: 'two' }],
		prevPage: 1,
		nextPage: 3
	})
	expect(query.offset).toHaveBeenCalledWith(2)
	expect(query.limit).toHaveBeenCalledWith(3)
})

test('tag filtering still uses matching piece IDs', async () => {
	query.execute.mockResolvedValueOnce([{ piece_id: 'note' }])
	const response = await GET(event(`?type=${config.pieces[0].type}&tag=field`))
	expect(response.status).toBe(200)
	expect(selectFrom).toHaveBeenCalledWith('web_pieces_tags')
	expect(query.where).toHaveBeenCalledWith('slug', '=', 'field')
	expect(query.where).toHaveBeenCalledWith('id', 'in', ['note'])
})

test('random ordering retains its unpaginated response shape', async () => {
	const response = await GET(event(`?type=${config.pieces[0].type}&order=random`))
	expect(await response.json()).toEqual({ pieces: [{ id: 'note' }] })
	expect(query.where).toHaveBeenCalledWith(expect.any(Function))
	expect(query.offset).not.toHaveBeenCalled()
	expect(hydrateWithAssets).toHaveBeenCalledOnce()
})

test.each([
	['?page=0', 404, 'no pieces for this page'],
	['?order=unknown', 400, 'invalid order']
])('existing query validation is preserved for %s', async (search, status, body) => {
	const response = await GET(event(search))
	expect(response.status).toBe(status)
	expect(await response.text()).toBe(body)
	expect(selectFrom).not.toHaveBeenCalled()
})
