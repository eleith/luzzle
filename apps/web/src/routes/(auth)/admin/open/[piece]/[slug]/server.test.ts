import { beforeEach, expect, test, vi } from 'vitest'
import { GET } from './+server'

const { config, selectFrom, query } = vi.hoisted(() => ({
	config: { pieces: [{ type: 'field-notes' }, { type: 'specimens' }] },
	selectFrom: vi.fn(),
	query: {
		select: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		executeTakeFirst: vi.fn()
	}
}))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/server/database', () => ({ db: { selectFrom } }))

function event(type: string) {
	return { params: { piece: type, slug: 'observation' } } as Parameters<typeof GET>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	selectFrom.mockReturnValue(query)
	query.executeTakeFirst.mockResolvedValue({ file_path: 'notes/observation.field-notes.md' })
})

test.each(config.pieces.map(({ type }) => type))(
	'configured %s opens the existing source editor URL',
	async (type) => {
		await expect(GET(event(type))).rejects.toMatchObject({
			status: 302,
			location: '/admin/piece/notes/observation.field-notes.md/source'
		})
		expect(query.select).toHaveBeenCalledExactlyOnceWith('file_path')
		expect(query.where.mock.calls).toEqual([
			['type', '=', type],
			['slug', '=', 'observation']
		])
	}
)

test('unknown types fail before looking up a persisted piece', async () => {
	await expect(GET(event('unconfigured'))).rejects.toMatchObject({ status: 404 })
	expect(selectFrom).not.toHaveBeenCalled()
})

test('missing pieces of a known type retain their 404 response', async () => {
	query.executeTakeFirst.mockResolvedValue(undefined)
	const response = await GET(event(config.pieces[0].type))
	expect(response.status).toBe(404)
	expect(await response.text()).toBe('piece not found')
})
