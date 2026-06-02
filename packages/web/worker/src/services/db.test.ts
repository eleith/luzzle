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

describe('createAppDb re-export', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	test('forwards the resolved path through to @luzzle/web.db', async () => {
		const createAppDbMock = vi.fn().mockReturnValue({ kind: 'kysely' })

		vi.doMock('@luzzle/web.db', () => ({
			createAppDb: createAppDbMock,
			resolveDbPath: (c: Config) => `${c.paths.config.replace(/\/[^/]+$/, '')}/${c.paths.database}`
		}))

		const { createAppDb, resolveDbPath: resolveDbPathFromDb } = await import('./db.js')

		const config = {
			paths: {
				config: '/etc/luzzle/config.yaml',
				database: 'data/luzzle.sqlite'
			}
		} as unknown as Config

		const result = createAppDb(resolveDbPathFromDb(config))

		expect(createAppDbMock).toHaveBeenCalledWith('/etc/luzzle/data/luzzle.sqlite')
		expect(result).toEqual({ kind: 'kysely' })
	})
})
