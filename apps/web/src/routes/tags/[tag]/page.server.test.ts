import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { runWebMigrations } from '@luzzle/web.db'
import { db } from '#lib/server/database/index.js'
import { load } from './+page.server.js'

vi.mock('#lib/server/database/index.js', async () => {
	const { createAppDb } = await import('@luzzle/web.db')
	return { db: createAppDb(':memory:') }
})
vi.mock('#lib/server/config.js', () => ({ config: { pieces: { book: {} } } }))
vi.mock('#lib/pieces/icon-listing/render.server.js', () => ({ renderPieceIcons: vi.fn() }))

function tagPage(tag: string, query = '') {
	return load({
		params: { tag },
		url: new URL(`https://garden.test/tags/${tag}${query}`)
	} as Parameters<typeof load>[0])
}

beforeAll(async () => {
	const { error } = await runWebMigrations(db)
	if (error) throw error
	const rows = ['hidden', 'visible', 'other'].map((id) => ({
		id,
		slug: id,
		key: id,
		title: id,
		type: id === 'hidden' ? 'removed-type' : 'book',
		date_consumed: 1,
		date_added: 1,
		file_path: `${id}.md`,
		json_metadata: '{}'
	}))
	await db.insertInto('web_pieces').values(rows).execute()
	await db
		.insertInto('web_pieces_tags')
		.values(
			rows.map(({ type, id }) => ({
				piece_type: type,
				piece_id: id,
				piece_slug: id,
				tag: id === 'other' ? 'Travel' : 'Field Notes',
				slug: id === 'other' ? 'travel' : 'field-notes'
			}))
		)
		.execute()
})

afterAll(() => db.destroy())

test('lists only tagged pieces with configured types', async () => {
	const result = await tagPage('field-notes')
	expect(result.pieces.map(({ id }) => id)).toEqual(['visible'])
	expect(result).toMatchObject({ page: 1, nextPage: null, tag: 'field-notes' })
})

test.each(['2', '0', '1foo', '999999999999999999'])(
	'page %s redirects to the first tag page',
	async (page) => {
		await expect(tagPage('field-notes', `?page=${page}`)).rejects.toMatchObject({
			status: 302,
			location: '/tags/field-notes'
		})
	}
)

test('missing tag returns not found on its first page', async () => {
	await expect(tagPage('missing')).rejects.toMatchObject({ status: 404 })
})
