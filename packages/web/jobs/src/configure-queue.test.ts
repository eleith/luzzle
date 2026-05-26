import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Sidequest } from 'sidequest'
import { configureQueue } from './configure-queue.js'

vi.mock('sidequest', () => ({
	Sidequest: {
		configure: vi.fn()
	}
}))

describe('configureQueue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('falls back to a self-referencing jobsFilePath when caller omits it', async () => {
		await configureQueue({ dbPath: '/tmp/queue.sqlite' })

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.manualJobResolution).toBe(true)
		expect(call?.jobsFilePath).toMatch(/configure-queue\.(ts|js)$/)
		expect(call?.maxConcurrentJobs).toBe(1)
		expect(call?.backend?.driver).toBe('@sidequest/sqlite-backend')
		const config = call?.backend?.config as Record<string, unknown>
		expect(config?.connection).toEqual({ filename: '/tmp/queue.sqlite' })
		expect(config?.pool).toHaveProperty('afterCreate')
	})

	test('forwards a caller-supplied jobsFilePath', async () => {
		await configureQueue({
			dbPath: '/app/queue.sqlite',
			jobsFilePath: '/srv/worker/sidequest.jobs.js'
		})

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.manualJobResolution).toBe(true)
		expect(call?.jobsFilePath).toBe('/srv/worker/sidequest.jobs.js')
		const config = call?.backend?.config as Record<string, unknown>
		expect(config?.connection).toEqual({ filename: '/app/queue.sqlite' })
	})

	test('afterCreate sets busy_timeout on the connection', async () => {
		await configureQueue({ dbPath: '/tmp/queue.sqlite' })

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		const config = call?.backend?.config as Record<string, { afterCreate: (conn: unknown, done: unknown) => void }>
		const { afterCreate } = config.pool

		const conn = { pragma: vi.fn() }
		const done = vi.fn()
		afterCreate(conn, done)

		expect(conn.pragma).toHaveBeenCalledWith('journal_mode = WAL')
		expect(conn.pragma).toHaveBeenCalledWith('busy_timeout = 5000')
		expect(conn.pragma).toHaveBeenCalledWith('synchronous = NORMAL')
		expect(conn.pragma).toHaveBeenCalledWith('cache_size = 2000')
		expect(done).toHaveBeenCalledWith(null, conn)
	})
})
