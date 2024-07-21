import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import * as cache from './cache.js'
import { mockDatabase } from '../database.mock.js'
import { makeCache } from './cache.fixtures.js'
import { createId } from '@paralleldrive/cuid2'
import { calculateHashFromFile } from './utils.js'

vi.mock('@luzzle/core')
vi.mock('@paralleldrive/cuid2')
vi.mock('./utils.js')

const mocks = {
	createId: vi.mocked(createId),
	calculateHashFromFile: vi.mocked(calculateHashFromFile),
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
		const slug = 'slug'
		const piece = 'piece'
		const dbCache = makeCache()

		queries.executeTakeFirst.mockReturnValueOnce(dbCache)

		const cacheGet = await cache.getCache(db, slug, piece)

		expect(queries.where).toHaveBeenCalledWith('slug', '=', slug)
		expect(queries.where).toHaveBeenCalledWith('type', '=', piece)
		expect(cacheGet).toEqual(dbCache)
	})

	test('getCache returns null', async () => {
		const { db, queries } = mockDatabase()
		const slug = 'slug'
		const piece = 'piece'

		queries.executeTakeFirst.mockReturnValueOnce(undefined)

		const cacheGet = await cache.getCache(db, slug, piece)

		expect(cacheGet).toEqual(null)
	})

	test('getCacheAll', async () => {
		const { db, queries } = mockDatabase()
		const piece = 'piece'
		const dbCache = makeCache()

		queries.execute.mockReturnValueOnce([dbCache])

		const cacheGet = await cache.getCacheAll(db, piece)

		expect(queries.where).toHaveBeenCalledWith('type', '=', piece)
		expect(cacheGet).toEqual([dbCache])
	})

	test('addCache', async () => {
		const { db, queries } = mockDatabase()
		const slug = 'slug'
		const piece = 'piece'
		const file = '/path/to/piece'
		const id = 'id'
		const hash = 'hash'

		mocks.calculateHashFromFile.mockResolvedValueOnce(hash)
		mocks.createId.mockReturnValueOnce(id)

		await cache.addCache(db, slug, piece, file)

		expect(mocks.calculateHashFromFile).toHaveBeenCalledWith(file)
		expect(mocks.createId).toHaveBeenCalledOnce()
		expect(queries.values).toHaveBeenCalledWith({ slug, type: piece, content_hash: hash, id })
	})

	test('updateCache', async () => {
		const { db, queries } = mockDatabase()
		const slug = 'slug'
		const piece = 'piece'
		const file = '/path/to/piece'
		const hash = 'hash'

		mocks.calculateHashFromFile.mockResolvedValueOnce(hash)

		await cache.updateCache(db, slug, piece, file)

		expect(queries.set).toHaveBeenCalledWith({
			content_hash: hash,
			date_updated: expect.any(Number),
		})
	})

	test('updateCache inserts', async () => {
		const { db, queries } = mockDatabase()
		const slug = 'slug'
		const piece = 'piece'
		const file = '/path/to/piece'
		const hash = 'hash'
		const id = 'id'

		mocks.calculateHashFromFile.mockResolvedValue(hash)
		mocks.createId.mockReturnValueOnce(id)
		queries.executeTakeFirst.mockReturnValueOnce(undefined)

		await cache.updateCache(db, slug, piece, file)

		expect(queries.set).toHaveBeenCalledWith({
			content_hash: hash,
			date_updated: expect.any(Number),
		})
		expect(queries.values).toHaveBeenCalledWith({ slug, type: piece, content_hash: hash, id })
		expect(mocks.createId).toHaveBeenCalledOnce()
		expect(mocks.calculateHashFromFile).toHaveBeenCalledTimes(2)
	})

	test('removeCache', async () => {
		const { db } = mockDatabase()
		const slug = 'slug'
		const piece = 'piece'

		await cache.removeCache(db, slug, piece)

		expect(db.deleteFrom).toHaveBeenCalledOnce()
	})
})
