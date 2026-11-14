import { db } from '#lib/server/database/index.js'
import { config } from '#lib/server/config.js'
import { getPieceStats, getAssetStats, type PieceStats } from '../dashboardStats.js'
import { getRecentlyPublishedPieces, getRecentlyEditedPieces } from '../pieces.js'
import { getFrontmatterValue } from '@luzzle/core'
import { getOpenWorkflowBackend } from '../workflow/index.js'
import { getLatestWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'
import type { WebPieces } from '@luzzle/web.db'

export interface DashboardView {
	meta: { title: string }
	pieceStats: PieceStats
	fileCount: number
	recentlyPublishedPieces: WebPieces[]
	recentlyEditedPieces: {
		id: string
		file_path: string
		type: string
		title: string
		date_added: number
		date_updated: number | null
		hasPublishedVersion: boolean
	}[]
	lastPublish: WorkflowRunRow | null
	setup: {
		pieceTypeCount: number
		aiConfigured: boolean
		authType: string | null
		archiveSyncConfigured: boolean
		cdnSyncConfigured: boolean
	}
}

async function loadRecentlyEditedPieces(): Promise<DashboardView['recentlyEditedPieces']> {
	const types = config.pieces.map((piece) => piece.type)
	const sources = await getRecentlyEditedPieces(db, 5, types)

	return sources.map(({ frontmatter_json, publishedHash, publishedAt, ...piece }) => {
		const { fields } = config.pieces.find((configured) => configured.type === piece.type)!
		const title = getFrontmatterValue<string>(JSON.parse(frontmatter_json), fields.title)
		return {
			...piece,
			title: title || piece.file_path,
			hasPublishedVersion: publishedAt != null || publishedHash != null
		}
	})
}

async function loadLastPublish(): Promise<WorkflowRunRow | null> {
	try {
		return await getLatestWorkflowRun(getOpenWorkflowBackend(), 'Publish')
	} catch (err) {
		console.error('Failed to query OpenWorkflow runs in dashboard loader:', err)
		return null
	}
}

export async function loadDashboardPage(): Promise<DashboardView> {
	const [pieceStats, assetStats, recentlyPublishedPieces, recentlyEditedPieces, lastPublish] =
		await Promise.all([
			getPieceStats(db),
			getAssetStats(db),
			getRecentlyPublishedPieces(db, 5),
			loadRecentlyEditedPieces(),
			loadLastPublish()
		])

	return {
		meta: { title: `dashboard | ${config.content.text.title}` },
		pieceStats,
		fileCount: pieceStats.total + assetStats.total,
		recentlyPublishedPieces,
		recentlyEditedPieces,
		lastPublish,
		setup: {
			pieceTypeCount: config.pieces.length,
			aiConfigured: Boolean(config.ai),
			authType: config.auth ? ('credentials' in config.auth ? 'local' : 'oidc') : null,
			archiveSyncConfigured: Boolean(config.sync.archive?.remote),
			cdnSyncConfigured: Boolean(config.sync.cdn?.remote)
		}
	}
}
