import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NodeSqliteDialect } from './NodeSqliteDialect.js'
import { CompiledQuery, Kysely, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler, TransactionSettings } from 'kysely'
import type { DatabaseSync } from 'node:sqlite'

describe('NodeSqliteDialect', () => {
	let mockDb: { prepare: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }
	let mockStatement: { all: ReturnType<typeof vi.fn>; run: ReturnType<typeof vi.fn> }

	beforeEach(() => {
		mockStatement = {
			all: vi.fn(),
			run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: 0 }),
		}
		mockDb = {
			prepare: vi.fn().mockReturnValue(mockStatement),
			close: vi.fn(),
		}
	})

	describe('NodeSqliteDialect', () => {
		it('should create adapter, introspector, compiler and driver', () => {
			const dialect = new NodeSqliteDialect({ database: mockDb as unknown as DatabaseSync })
			
			expect(dialect.createAdapter()).toBeInstanceOf(SqliteAdapter)
			expect(dialect.createQueryCompiler()).toBeInstanceOf(SqliteQueryCompiler)
			expect(dialect.createIntrospector({} as Kysely<unknown>)).toBeInstanceOf(SqliteIntrospector)
			
			const driver = dialect.createDriver()
			expect(driver).toBeDefined()
		})
	})

	describe('NodeSqliteDriver', () => {
		it('should initialize and manage connections and transactions', async () => {
			const dialect = new NodeSqliteDialect({ database: mockDb as unknown as DatabaseSync })
			const driver = dialect.createDriver()

			await driver.init()
			const connection = await driver.acquireConnection()
			expect(connection).toBeDefined()

			await driver.beginTransaction(connection, {} as TransactionSettings)
			expect(mockDb.prepare).toHaveBeenCalledWith('begin')
			expect(mockStatement.run).toHaveBeenCalled()

			await driver.commitTransaction(connection)
			expect(mockDb.prepare).toHaveBeenCalledWith('commit')

			await driver.rollbackTransaction(connection)
			expect(mockDb.prepare).toHaveBeenCalledWith('rollback')

			await driver.releaseConnection(connection)

			await driver.destroy()
			expect(mockDb.close).toHaveBeenCalled()
		})
	})

	describe('NodeSqliteConnection', () => {
		it('should execute read queries using stmt.all()', async () => {
			const dialect = new NodeSqliteDialect({ database: mockDb as unknown as DatabaseSync })
			const driver = dialect.createDriver()
			const connection = await driver.acquireConnection()

			mockStatement.all.mockReturnValue([{ id: 1 }])

			const query = CompiledQuery.raw('SELECT * FROM users WHERE id = ?', [1])
			const result = await connection.executeQuery(query)

			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?')
			expect(mockStatement.all).toHaveBeenCalledWith(1)
			expect(result).toEqual({ rows: [{ id: 1 }] })
		})

		it('should execute pragma queries using stmt.all()', async () => {
			const dialect = new NodeSqliteDialect({ database: mockDb as unknown as DatabaseSync })
			const driver = dialect.createDriver()
			const connection = await driver.acquireConnection()

			mockStatement.all.mockReturnValue([{ table: 'users' }])

			const query = CompiledQuery.raw('PRAGMA table_info(users)')
			const result = await connection.executeQuery(query)

			expect(mockDb.prepare).toHaveBeenCalledWith('PRAGMA table_info(users)')
			expect(mockStatement.all).toHaveBeenCalledWith()
			expect(result).toEqual({ rows: [{ table: 'users' }] })
		})

		it('should execute returning queries using stmt.all()', async () => {
			const dialect = new NodeSqliteDialect({ database: mockDb as unknown as DatabaseSync })
			const driver = dialect.createDriver()
			const connection = await driver.acquireConnection()

			mockStatement.all.mockReturnValue([{ id: 2 }])

			const query = CompiledQuery.raw('INSERT INTO users (name) VALUES (?) RETURNING id', ['test'])
			const result = await connection.executeQuery(query)

			expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO users (name) VALUES (?) RETURNING id')
			expect(mockStatement.all).toHaveBeenCalledWith('test')
			expect(result).toEqual({ rows: [{ id: 2 }] })
		})

		it('should execute write queries using stmt.run()', async () => {
			const dialect = new NodeSqliteDialect({ database: mockDb as unknown as DatabaseSync })
			const driver = dialect.createDriver()
			const connection = await driver.acquireConnection()

			mockStatement.run.mockReturnValue({ changes: 1, lastInsertRowid: 42 })

			const query = CompiledQuery.raw('UPDATE users SET name = ? WHERE id = ?', ['test', 1])
			const result = await connection.executeQuery(query)

			expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE users SET name = ? WHERE id = ?')
			expect(mockStatement.run).toHaveBeenCalledWith('test', 1)
			expect(result).toEqual({
				numAffectedRows: 1n,
				insertId: 42n,
				rows: [],
			})
		})

		it('should throw on streamQuery', async () => {
			const dialect = new NodeSqliteDialect({ database: mockDb as unknown as DatabaseSync })
			const driver = dialect.createDriver()
			const connection = await driver.acquireConnection()

			const stream = connection.streamQuery(CompiledQuery.raw('SELECT 1'))
			await expect(stream.next()).rejects.toThrow('NodeSqliteDialect does not support streaming')
		})
	})
})
