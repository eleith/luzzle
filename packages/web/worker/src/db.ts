import path from 'node:path'
import { getDatabaseClient } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'

// Local copies of the web db row types. These are intentionally duplicated from
// @luzzle/web.config (and also exist in @luzzle/web/explorer). The duplication is
// a Phase 1 stance to keep worker independent of web.config's domain types; Phase 2
// will decide whether to consolidate or keep duplicated.
export interface WebPieces {
	id: string
	key: string
	title: string
	slug: string
	file_path: string
	note?: string
	date_updated?: number
	date_added: number
	date_consumed?: number
	type: string
	json_metadata: string
	summary?: string
	keywords?: string
}

export interface WebPiecesAsset {
	piece_file_path: string
	piece_key: string
	piece_asset_path?: string | null
	piece_field_path?: string
	asset_key: string
	transformation: string
	asset_path?: string | null
	mime_type: string
	is_embedded?: 0 | 1
	content?: string
}

export interface WebPieceTags {
	piece_slug: string
	piece_type: string
	piece_id: string
	tag: string
	slug: string
}

export type WebDatabase = {
	web_pieces: WebPieces
	web_pieces_tags: WebPieceTags
	web_pieces_assets: WebPiecesAsset
}

export function resolveDbPath(config: Config): string {
	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve database path')
	}
	return path.resolve(path.dirname(config.paths.config), config.paths.database)
}

export function resolveQueueDbPath(config: Config): string {
	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve queue db path')
	}
	const queuePath = config.worker?.queue?.path ?? './data/sidequest.sqlite'
	return path.resolve(path.dirname(config.paths.config), queuePath)
}

export function createWorkerDb(config: Config) {
	const dbPath = resolveDbPath(config)
	return getDatabaseClient(dbPath).withTables<WebDatabase>()
}
