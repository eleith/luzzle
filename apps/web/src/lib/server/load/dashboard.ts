import { db } from '$lib/server/database'
import { config, type AppConfig } from '$lib/server/config'
import { getPieceStats, getAssetStats, type PieceStats } from '../dashboardStats.js'
import { getRecentlyEditedPieces } from '../pieces.js'
import { getOpenWorkflowDb } from '../workflow/index.js'
import { findInFlightPublishRun } from '../workflow/publish.js'
import { getLatestWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'
import type { WebPieces } from '@luzzle/web.db'

const AUTH_TYPE_LABELS: Record<AppConfig['auth']['type'], string> = {
	oidc: 'oidc',
	credentials: 'local'
}

export interface DashboardView {
	meta: { title: string }
	pieceStats: PieceStats
	fileCount: number
	recentlyEditedPieces: WebPieces[]
	lastPublish: WorkflowRunRow | null
	inFlightPublish: WorkflowRunRow | null
	setup: {
		pieceTypeCount: number
		aiConfigured: boolean
		authType: string | null
		archiveSyncConfigured: boolean
		cdnSyncConfigured: boolean
	}
}

export async function loadDashboardPage(): Promise<DashboardView> {
	const meta = { title: `dashboard | ${config.content.text.title}` }

	const [pieceStats, assetStats, recentlyEditedPieces] = await Promise.all([
		getPieceStats(db),
		getAssetStats(db),
		getRecentlyEditedPieces(db, 5)
	])

	let lastPublish: WorkflowRunRow | null = null
	let inFlightPublish: WorkflowRunRow | null = null

	try {
		const openWorkflowDb = getOpenWorkflowDb()
		lastPublish = getLatestWorkflowRun(openWorkflowDb, 'Publish')
		inFlightPublish = findInFlightPublishRun(openWorkflowDb)
	} catch (err) {
		console.error('Failed to query OpenWorkflow runs in dashboard loader:', err)
	}

	return {
		meta,
		pieceStats,
		fileCount: pieceStats.total + assetStats.total,
		recentlyEditedPieces,
		lastPublish,
		inFlightPublish,
		setup: {
			pieceTypeCount: config.pieces.length,
			aiConfigured: Boolean(config.ai),
			authType: config.auth.enabled ? AUTH_TYPE_LABELS[config.auth.type] : null,
			archiveSyncConfigured: Boolean(config.sync.archive?.remote),
			cdnSyncConfigured: Boolean(config.sync.cdn?.remote)
		}
	}
}
