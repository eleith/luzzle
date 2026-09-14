import { describe, test, expect, vi, beforeEach } from 'vitest'
import { config } from '$lib/server/config'
import { getPieceStats, getAssetStats } from '../dashboardStats.js'
import { getRecentlyEditedPieces } from '../pieces.js'
import { getOpenWorkflowDb } from '../workflow/index.js'
import { findInFlightPublishRun } from '../workflow/publish.js'
import { getLatestWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'
import { loadDashboardPage } from './dashboard.js'

vi.mock('$lib/server/database', () => ({ db: {} }))

vi.mock('$lib/server/config', () => ({
	config: {
		content: { text: { title: 'luzzle' } },
		pieces: [{ type: 'article' }, { type: 'bookmark' }],
		ai: { provider: 'google', api_key: 'key' },
		auth: { enabled: true, secret: 'shh', type: 'oidc' },
		sync: { archive: { remote: 'archive-remote' }, cdn: {} }
	}
}))

vi.mock('../dashboardStats.js', () => ({
	getPieceStats: vi.fn(),
	getAssetStats: vi.fn()
}))

vi.mock('../pieces.js', () => ({
	getRecentlyEditedPieces: vi.fn()
}))

vi.mock('../workflow/index.js', () => ({
	getOpenWorkflowDb: vi.fn()
}))

vi.mock('../workflow/publish.js', () => ({
	findInFlightPublishRun: vi.fn()
}))

vi.mock('@luzzle/web.jobs', () => ({
	getLatestWorkflowRun: vi.fn()
}))

const mocks = {
	getPieceStats: vi.mocked(getPieceStats),
	getAssetStats: vi.mocked(getAssetStats),
	getRecentlyEditedPieces: vi.mocked(getRecentlyEditedPieces),
	getOpenWorkflowDb: vi.mocked(getOpenWorkflowDb),
	findInFlightPublishRun: vi.mocked(findInFlightPublishRun),
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
	mocks.getOpenWorkflowDb.mockReturnValue({} as never)
	mocks.findInFlightPublishRun.mockReturnValue(null)
	mocks.getLatestWorkflowRun.mockReturnValue(null)
	config.auth = { enabled: true, secret: 'shh', type: 'oidc' }
	config.sync = { archive: { remote: 'archive-remote' }, cdn: {} }
})

describe('loadDashboardPage', () => {
	test('assembles stats, setup config, and publish state into the page shape', async () => {
		mocks.getLatestWorkflowRun.mockReturnValue(makeRun())

		const result = await loadDashboardPage()

		expect(result).toEqual({
			meta: { title: 'dashboard | luzzle' },
			pieceStats: { total: 3, byType: [{ type: 'article', count: 3 }] },
			assetStats: { total: 2 },
			recentlyEditedPieces: [],
			lastPublish: makeRun(),
			inFlightPublish: null,
			setup: {
				pieceTypeCount: 2,
				aiConfigured: true,
				authType: 'oidc',
				archiveSyncConfigured: true,
				cdnSyncConfigured: false
			}
		})
	})

	test('reports an in-flight publish run instead of the last completed one', async () => {
		mocks.findInFlightPublishRun.mockReturnValue(makeRun({ id: 'pub-2', status: 'running' }))

		const result = await loadDashboardPage()

		expect(result.inFlightPublish).toEqual(makeRun({ id: 'pub-2', status: 'running' }))
	})

	test('reports no auth type when auth is disabled', async () => {
		config.auth = { enabled: false, secret: 'shh', type: 'credentials' }

		const result = await loadDashboardPage()

		expect(result.setup.authType).toBeNull()
	})

	test('shortens the credentials auth type to a display label', async () => {
		config.auth = { enabled: true, secret: 'shh', type: 'credentials' }

		const result = await loadDashboardPage()

		expect(result.setup.authType).toBe('local')
	})

	test('falls back to null publish state when OpenWorkflow queries fail', async () => {
		mocks.getOpenWorkflowDb.mockImplementation(() => {
			throw new Error('db unavailable')
		})

		const result = await loadDashboardPage()

		expect(result.lastPublish).toBeNull()
		expect(result.inFlightPublish).toBeNull()
	})
})
