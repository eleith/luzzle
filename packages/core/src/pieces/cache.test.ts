import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import * as cache from './cache.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { type LuzzleDatabase } from '../database/tables/index.js'

let db: LuzzleDatabase

beforeEach(async () => {
	db = await setupDatabase()
})

afterEach(async () => {
	await teardownDatabase(db)
})

describe('pieces/cache.ts', () => {
	test('getCache returns cached entry by file_path', async () => {
		await cache.addCache(db, 'book.md', 'hash1')

		const result = await cache.getCache(db, 'book.md')

		expect(result).toMatchObject({
			file_path: 'book.md',
			content_hash: 'hash1',
		})
	})

	test('getCache returns null when not found', async () => {
		const result = await cache.getCache(db, 'missing.md')

		expect(result).toBeNull()
	})

	test('getCacheAll returns all entries', async () => {
		await cache.addCache(db, 'a.md', 'hash_a')
		await cache.addCache(db, 'b.md', 'hash_b')

		const result = await cache.getCacheAll(db)

		expect(result).toHaveLength(2)
	})

	test('addCache inserts and upserts on conflict', async () => {
		await cache.addCache(db, 'book.md', 'hash1')
		await cache.addCache(db, 'book.md', 'hash2')

		const result = await cache.getCache(db, 'book.md')
		expect(result).toMatchObject({
			file_path: 'book.md',
			content_hash: 'hash2',
		})

		const all = await cache.getCacheAll(db)
		expect(all).toHaveLength(1)
	})

	test('updateCache updates existing entry', async () => {
		await cache.addCache(db, 'book.md', 'hash1')

		await cache.updateCache(db, 'book.md', 'hash2')

		const result = await cache.getCache(db, 'book.md')
		expect(result).toMatchObject({
			file_path: 'book.md',
			content_hash: 'hash2',
		})
	})

	test('updateCache inserts when entry does not exist', async () => {
		await cache.updateCache(db, 'new.md', 'hash_new')

		const result = await cache.getCache(db, 'new.md')
		expect(result).toMatchObject({
			file_path: 'new.md',
			content_hash: 'hash_new',
		})
	})

	test('removeCache deletes by file_path', async () => {
		await cache.addCache(db, 'book.md', 'hash1')

		await cache.removeCache(db, 'book.md')

		const result = await cache.getCache(db, 'book.md')
		expect(result).toBeNull()
	})

	test('clearCache deletes all entries', async () => {
		await cache.addCache(db, 'a.md', 'hash_a')
		await cache.addCache(db, 'b.md', 'hash_b')

		await cache.clearCache(db)

		const all = await cache.getCacheAll(db)
		expect(all).toHaveLength(0)
	})
})
