import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { makeContext } from '../commands/context.fixtures.js'
import * as tagLibrary from './tags.js'
import { mockDatabase } from '../database.mock.js'
import { Tag } from '@luzzle/kysely'

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	addTagsTo: vi.spyOn(tagLibrary._private, 'addTagsTo'),
	removeTagsFrom: vi.spyOn(tagLibrary._private, 'removeTagsFrom'),
}

const spies: SpyInstance[] = []

describe('lib/tags/tags.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		spies.forEach((spy) => {
			spy.mockRestore()
		})
	})

	test('addTagsTo', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const tags = ['one', 'two', 'three']
		const id = 'id1'
		const tagId = 'tagId1'
		const type = tagLibrary.TagMapTypes.BOOKS

		kysely.queries.executeTakeFirstOrThrow.mockResolvedValue({ id: tagId })

		await tagLibrary.addTagsTo(ctx, tags, id, type)

		expect(kysely.queries.values).toHaveBeenCalledTimes(tags.length * 2)
		expect(kysely.queries.execute).toHaveBeenCalledTimes(tags.length)
	})

	test('removeTagsFrom', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const tagSlugs = ['one', 'two', 'three']
		const tags = tagSlugs.map((slug) => ({ slug, id: 'id' } as Tag))
		const tagCounts = tagSlugs.map((slug, i) => ({
			slug,
			id_tag: 'id',
			item_count: i,
		}))
		const id = 'id1'
		const type = tagLibrary.TagMapTypes.BOOKS

		kysely.queries.execute.mockResolvedValueOnce(tags)
		kysely.queries.execute.mockResolvedValueOnce(null)
		kysely.queries.execute.mockResolvedValueOnce(tagCounts)
		kysely.queries.execute.mockResolvedValueOnce(null)

		await tagLibrary.removeTagsFrom(ctx, tagSlugs, id, type)

		expect(kysely.queries.execute).toHaveBeenCalledTimes(4)
	})

	test('removeAllTagsFrom', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const tagSlugs = ['one', 'two', 'three']
		const tagCounts = tagSlugs.map((slug, i) => ({
			slug,
			id_tag: 'id',
			item_count: i,
		}))
		const id = 'id1'
		const type = tagLibrary.TagMapTypes.BOOKS

		kysely.queries.execute.mockResolvedValueOnce(null)
		kysely.queries.execute.mockResolvedValueOnce(tagCounts)
		kysely.queries.execute.mockResolvedValueOnce(null)

		await tagLibrary.removeAllTagsFrom(ctx, [id], type)

		expect(kysely.db.deleteFrom).toHaveBeenCalledTimes(2)
		expect(kysely.queries.execute).toHaveBeenCalledTimes(3)
	})

	test('syncTagsFor', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const tagNames = ['one', 'two', 'three']
		const tags = ['one', 'two', 'found'].map((slug) => ({ slug, id: 'id' } as Tag))
		const id = 'id1'
		const type = tagLibrary.TagMapTypes.BOOKS

		kysely.queries.execute.mockResolvedValueOnce(tags)

		await tagLibrary.syncTagsFor(ctx, tagNames, id, type)

		expect(mocks.addTagsTo).toHaveBeenCalledOnce()
		expect(mocks.removeTagsFrom).toHaveBeenCalledOnce()
	})

	test('keywordsToTags', () => {
		const keywords = 'one,two,  two,three  '
		const tags = tagLibrary.keywordsToTags(keywords)

		expect(tags).toEqual(['one', 'two', 'three'])
	})
})
