import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import * as cache from './cache.js'
import { mockDatabase } from '../database.mock.js'
import { makeCache } from './cache.fixtures.js'
import { createId } from '@paralleldrive/cuid2'

vi.mock('@luzzle/core')
vi.mock('@paralleldrive/cuid2')

const mocks = {
	createId: vi.mocked(createId),
}

const spies: MockInstance[] = []

describe('lib/pieces/cache.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		spies.forEach((spy) => {
			spy.mockRestore()
		})
	})

	test('getCache', async () => {
		const { db, queries } = mockDatabase()
		const file = 'slug'
		const dbCache = makeCache()

		queries.executeTakeFirst.mockReturnValueOnce(dbCache)

		const cacheGet = await cache.getCache(db, file)

		expect(queries.where).toHaveBeenCalledWith('file_path', '=', file)
		expect(cacheGet).toEqual(dbCache)
	})

	test('getCache returns null', async () => {
		const { db, queries } = mockDatabase()
		const file = 'slug'

		queries.executeTakeFirst.mockReturnValueOnce(undefined)

		const cacheGet = await cache.getCache(db, file)

		expect(cacheGet).toEqual(null)
	})

	test('getCacheAll', async () => {
		const { db, queries } = mockDatabase()
		const dbCache = makeCache()

		queries.execute.mockReturnValueOnce([dbCache])

		const cacheGet = await cache.getCacheAll(db)

		expect(cacheGet).toEqual([dbCache])
	})

	test('addCache', async () => {
		const { db, queries } = mockDatabase()
		const file = '/path/to/piece'
		const id = 'id'
		const hash = 'hash'

		mocks.createId.mockReturnValueOnce(id)

		await cache.addCache(db, file, hash)

		expect(mocks.createId).toHaveBeenCalledOnce()
		expect(queries.values).toHaveBeenCalledWith({
			file_path: file,
			content_hash: hash,
			id,
		})
	})

	test('updateCache', async () => {
		const { db, queries } = mockDatabase()
		const file = '/path/to/piece'
		const hash = 'hash'

		await cache.updateCache(db, file, hash)

		expect(queries.set).toHaveBeenCalledWith({
			content_hash: hash,
			date_updated: expect.any(Number),
		})
	})

	test('updateCache inserts', async () => {
		const { db, queries } = mockDatabase()
		const file = '/path/to/piece'
		const hash = 'hash'
		const id = 'id'

		mocks.createId.mockReturnValueOnce(id)
		queries.executeTakeFirst.mockReturnValueOnce(undefined)

		await cache.updateCache(db, file, hash)

		expect(queries.set).toHaveBeenCalledWith({
			content_hash: hash,
			date_updated: expect.any(Number),
		})
		expect(queries.values).toHaveBeenCalledWith({
			file_path: file,
			content_hash: hash,
			id,
		})
		expect(mocks.createId).toHaveBeenCalledOnce()
	})

	test('removeCache', async () => {
		const { db } = mockDatabase()
		const slug = 'slug'

		await cache.removeCache(db, slug)

		expect(db.deleteFrom).toHaveBeenCalledOnce()
	})

	test('removeCache', async () => {
		const { db } = mockDatabase()

		await cache.clearCache(db)

		expect(db.deleteFrom).toHaveBeenCalledOnce()
	})
})
