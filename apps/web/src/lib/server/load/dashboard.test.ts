import { describe, test, expect, vi, beforeEach } from 'vitest'
import { config } from '$lib/server/config'
import { getPieceStats, getAssetStats } from '../dashboardStats.js'
import { getRecentlyEditedPieces } from '../pieces.js'
import { getOpenWorkflowBackend } from '../workflow/index.js'
import { getLatestWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'
import { makeConfig, credentialsAuth, oidcAuth } from '../config.fixture'
import { loadDashboardPage } from './dashboard.js'

vi.mock('$lib/server/database', () => ({ db: {} }))

vi.mock('$lib/server/config', async () => {
	const { makeConfig, oidcAuth } = await import('../config.fixture')
	const defaults = makeConfig()
	return {
		config: makeConfig({
			content: { ...defaults.content, text: { title: 'luzzle', description: '' } },
			pieces: [
				{ type: 'article', fields: { title: 'title', date_consumed: 'date' } },
				{ type: 'bookmark', fields: { title: 'title', date_consumed: 'date' } }
			],
			ai: { provider: 'google', api_key: 'key' },
			auth: oidcAuth,
			sync: { ...defaults.sync, archive: { ...defaults.sync.archive, remote: 'archive-remote' } }
		})
	}
})

vi.mock('../dashboardStats.js', () => ({
	getPieceStats: vi.fn(),
	getAssetStats: vi.fn()
}))

vi.mock('../pieces.js', () => ({
	getRecentlyEditedPieces: vi.fn()
}))

vi.mock('../workflow/index.js', () => ({
	getOpenWorkflowBackend: vi.fn()
}))

vi.mock('@luzzle/web.jobs', () => ({
	getLatestWorkflowRun: vi.fn()
}))

const mocks = {
	getPieceStats: vi.mocked(getPieceStats),
	getAssetStats: vi.mocked(getAssetStats),
	getRecentlyEditedPieces: vi.mocked(getRecentlyEditedPieces),
	getOpenWorkflowBackend: vi.mocked(getOpenWorkflowBackend),
	getLatestWorkflowRun: vi.mocked(getLatestWorkflowRun)
}

function makeRun(overrides: Partial<WorkflowRunRow> = {}): WorkflowRunRow {
	return {
		id: 'pub-1',
		workflow_name: 'Publish',
		status: 'completed',
		error: null,
		input: '{}',
		output: null,
		finished_at: '2026-06-20T00:00:00Z',
		created_at: '2026-06-20T00:00:00Z',
		...overrides
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.getPieceStats.mockResolvedValue({ total: 3, byType: [{ type: 'article', count: 3 }] })
	mocks.getAssetStats.mockResolvedValue({ total: 2 })
	mocks.getRecentlyEditedPieces.mockResolvedValue([])
	mocks.getOpenWorkflowBackend.mockReturnValue({} as never)
	mocks.getLatestWorkflowRun.mockResolvedValue(null)
	config.auth = oidcAuth
	const defaults = makeConfig()
	config.sync = {
		...defaults.sync,
		archive: { ...defaults.sync.archive, remote: 'archive-remote' }
	}
})

describe('loadDashboardPage', () => {
	test('assembles stats, setup config, and publish state into the page shape', async () => {
		mocks.getLatestWorkflowRun.mockResolvedValue(makeRun())

		const result = await loadDashboardPage()

		expect(result).toEqual({
			meta: { title: 'dashboard | luzzle' },
			pieceStats: { total: 3, byType: [{ type: 'article', count: 3 }] },
			fileCount: 5,
			recentlyEditedPieces: [],
			lastPublish: makeRun(),
			setup: {
				pieceTypeCount: 2,
				aiConfigured: true,
				authType: 'oidc',
				archiveSyncConfigured: true,
				cdnSyncConfigured: false
			}
		})
	})

	test('reports the latest publish attempt even if it failed', async () => {
		mocks.getLatestWorkflowRun.mockResolvedValue(makeRun({ status: 'failed' }))

		const result = await loadDashboardPage()

		expect(result.lastPublish).toEqual(makeRun({ status: 'failed' }))
	})

	test('reports no auth type when auth is absent', async () => {
		config.auth = undefined

		const result = await loadDashboardPage()

		expect(result.setup.authType).toBeNull()
	})

	test('shortens the credentials auth type to a display label', async () => {
		config.auth = credentialsAuth

		const result = await loadDashboardPage()

		expect(result.setup.authType).toBe('local')
	})

	test('falls back to null publish state when OpenWorkflow queries fail', async () => {
		mocks.getOpenWorkflowBackend.mockImplementation(() => {
			throw new Error('db unavailable')
		})

		const result = await loadDashboardPage()

		expect(result.lastPublish).toBeNull()
	})
})
