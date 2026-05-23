import { describe, expect, test, vi, beforeEach } from 'vitest'
import type { Config } from '@luzzle/web.config'
import { resolveDbPath, resolveQueueDbPath } from './db.js'

describe('resolveDbPath', () => {
	test('resolves database path relative to the config file directory', () => {
		const config = {
			paths: {
				config: '/etc/luzzle/config.yaml',
				database: 'data/luzzle.sqlite'
			}
		} as unknown as Config
		expect(resolveDbPath(config)).toBe('/etc/luzzle/data/luzzle.sqlite')
	})

	test('handles absolute database paths by ignoring the config dir', () => {
		const config = {
			paths: {
				config: '/etc/luzzle/config.yaml',
				database: '/var/lib/luzzle/db.sqlite'
			}
		} as unknown as Config
		expect(resolveDbPath(config)).toBe('/var/lib/luzzle/db.sqlite')
	})

	test('throws when paths.config is missing', () => {
		const config = {
			paths: {
				database: 'data/luzzle.sqlite'
			}
		} as unknown as Config
		expect(() => resolveDbPath(config)).toThrow(/paths\.config is missing/)
	})
})

describe('resolveQueueDbPath', () => {
	test('resolves worker.queue.path relative to the config file directory', () => {
		const config = {
			paths: { config: '/etc/luzzle/config.yaml', database: 'data/luzzle.sqlite' },
			worker: { queue: { path: 'data/sidequest.sqlite' } }
		} as unknown as Config
		expect(resolveQueueDbPath(config)).toBe('/etc/luzzle/data/sidequest.sqlite')
	})

	test('handles absolute worker.queue.path', () => {
		const config = {
			paths: { config: '/etc/luzzle/config.yaml', database: 'data/luzzle.sqlite' },
			worker: { queue: { path: '/var/queue/sidequest.db' } }
		} as unknown as Config
		expect(resolveQueueDbPath(config)).toBe('/var/queue/sidequest.db')
	})

	test('falls back to ./data/sidequest.sqlite when worker config is absent', () => {
		const config = {
			paths: { config: '/etc/luzzle/config.yaml', database: 'data/luzzle.sqlite' }
		} as unknown as Config
		expect(resolveQueueDbPath(config)).toBe('/etc/luzzle/data/sidequest.sqlite')
	})

	test('throws when paths.config is missing', () => {
		const config = {
			paths: { database: 'data/luzzle.sqlite' }
		} as unknown as Config
		expect(() => resolveQueueDbPath(config)).toThrow(/paths\.config is missing/)
	})
})

describe('createWorkerDb', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	test('calls getDatabaseClient with the resolved path', async () => {
		const withTables = vi.fn().mockReturnValue({ kind: 'kysely' })
		const getDatabaseClient = vi.fn().mockReturnValue({ withTables })

		vi.doMock('@luzzle/core', () => ({ getDatabaseClient }))

		const { createAppDb } = await import('./db.js')

		const config = {
			paths: {
				config: '/etc/luzzle/config.yaml',
				database: 'data/luzzle.sqlite'
			}
		} as unknown as Config

		const result = createAppDb(resolveDbPath(config))

		expect(getDatabaseClient).toHaveBeenCalledWith('/etc/luzzle/data/luzzle.sqlite')
		expect(withTables).toHaveBeenCalledOnce()
		expect(result).toEqual({ kind: 'kysely' })
	})
})
