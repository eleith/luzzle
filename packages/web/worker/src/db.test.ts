import { describe, expect, test, vi, beforeEach } from 'vitest'
import type { Config } from '@luzzle/web.config'
import { resolveDbPath } from './db.js'

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

describe('createWorkerDb', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	test('calls getDatabaseClient with the resolved path', async () => {
		const withTables = vi.fn().mockReturnValue({ kind: 'kysely' })
		const getDatabaseClient = vi.fn().mockReturnValue({ withTables })

		vi.doMock('@luzzle/core', () => ({ getDatabaseClient }))

		const { createWorkerDb } = await import('./db.js')

		const config = {
			paths: {
				config: '/etc/luzzle/config.yaml',
				database: 'data/luzzle.sqlite'
			}
		} as unknown as Config

		const result = createWorkerDb(config)

		expect(getDatabaseClient).toHaveBeenCalledWith('/etc/luzzle/data/luzzle.sqlite')
		expect(withTables).toHaveBeenCalledOnce()
		expect(result).toEqual({ kind: 'kysely' })
	})
})
