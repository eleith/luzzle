import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server'

const { config, query, selectFrom, sql, hydrateWithAssets } = vi.hoisted(() => ({
	config: { pieces: [{ type: 'field-notes' }, { type: 'specimens' }] },
	query: {
		selectAll: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		execute: vi.fn()
	},
	selectFrom: vi.fn(),
	sql: vi.fn(),
	hydrateWithAssets: vi.fn()
}))
vi.mock('#lib/server/config.js', () => ({ config }))
vi.mock('#lib/server/database/index.js', () => ({ db: { selectFrom }, sql }))
vi.mock('#lib/pieces/assets.server.js', () => ({ hydrateWithAssets }))

function event(type?: string, search = '') {
	return {
		params: { piece: type },
		url: new URL(`https://app.example/pieces${type ? `/${type}` : ''}${search}`)
	} as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	selectFrom.mockReturnValue(query)
	query.execute.mockResolvedValue([{ id: 'note' }])
	hydrateWithAssets.mockImplementation(async (pieces) => pieces)
})

test.each(config.pieces.map(({ type }) => type))(
	'lists runtime-configured %s with hydration and existing ordering',
	async (type) => {
		expect(await load(event(type))).toEqual({
			pieces: [{ id: 'note' }],
			nextPage: null,
			page: 1,
			year: null
		})
		expect(query.where).toHaveBeenCalledExactlyOnceWith('type', '=', type)
		expect(query.orderBy.mock.calls).toEqual([
			['date_consumed', 'desc'],
			['date_added', 'desc']
		])
		expect(query.offset).toHaveBeenCalledWith(0)
		expect(query.limit).toHaveBeenCalledWith(51)
		expect(hydrateWithAssets).toHaveBeenCalledExactlyOnceWith([{ id: 'note' }])
	}
)

test('omitting the optional type lists all pieces', async () => {
	await load(event())
	expect(query.where).not.toHaveBeenCalled()
	expect(hydrateWithAssets).toHaveBeenCalledOnce()
})

test('unknown types fail before queries, hydration, or pagination redirects', async () => {
	await expect(load(event('unconfigured', '?page=0'))).rejects.toMatchObject({ status: 404 })
	expect(selectFrom).not.toHaveBeenCalled()
	expect(hydrateWithAssets).not.toHaveBeenCalled()
})

test('year and page filters retain their existing pagination semantics', async () => {
	const pieces = Array.from({ length: 51 }, (_, id) => ({ id }))
	query.execute.mockResolvedValue(pieces)
	sql.mockReturnValue('year-expression')
	expect(await load(event(config.pieces[0].type, '?page=2&year=2025'))).toMatchObject({
		pieces: pieces.slice(0, 50),
		nextPage: 3,
		page: 2,
		year: 2025
	})
	expect(query.where).toHaveBeenCalledWith('year-expression', '=', '2025')
	expect(query.offset).toHaveBeenCalledWith(50)
})

test('empty later pages still redirect to the unpaginated listing', async () => {
	query.execute.mockResolvedValue([])
	await expect(load(event(undefined, '?page=2'))).rejects.toMatchObject({
		status: 302,
		location: '/pieces'
	})
})

test('invalid pages still redirect before querying', async () => {
	await expect(load(event(undefined, '?page=0'))).rejects.toMatchObject({
		status: 302,
		location: '/pieces'
	})
	expect(selectFrom).not.toHaveBeenCalled()
})
