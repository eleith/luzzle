import type { PiecesDiff } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { Kysely } from 'kysely'
import type { AppDatabase } from './db.js'

export interface PublicationPiece {
	filePath: string
	contentHash: string
}

export interface PendingPublication {
	pieces: PublicationPiece[]
	diff: PiecesDiff['pieces']
}

export async function getPendingPublication(
	db: Kysely<AppDatabase>,
	config: Config
): Promise<PendingPublication> {
	const pending: PendingPublication = {
		pieces: [],
		diff: { added: [], updated: [], pruned: [] },
	}
	const livePaths = new Set<string>()

	for (const pieceConfig of config.pieces) {
		const items = await db
			.selectFrom('pieces_items')
			.leftJoin('pieces_cache', 'pieces_cache.file_path', 'pieces_items.file_path')
			.leftJoin('web_pieces', 'web_pieces.file_path', 'pieces_items.file_path')
			.select([
				'pieces_items.file_path as filePath',
				'pieces_cache.content_hash as indexedHash',
				'web_pieces.content_hash as publishedHash',
				'web_pieces.id as publishedId',
			])
			.where('pieces_items.type', '=', pieceConfig.type)
			.orderBy('pieces_items.file_path')
			.execute()

		for (const item of items) {
			livePaths.add(item.filePath)
			if (item.indexedHash === null) continue
			if (item.indexedHash === item.publishedHash) continue

			pending.pieces.push({ filePath: item.filePath, contentHash: item.indexedHash })
			if (item.publishedId === null) {
				pending.diff.added.push(item.filePath)
			} else {
				pending.diff.updated.push(item.filePath)
			}
		}
	}

	const published = await db.selectFrom('web_pieces').select('file_path').execute()
	for (const piece of published) {
		if (!livePaths.has(piece.file_path)) {
			pending.diff.pruned.push(piece.file_path)
		}
	}

	return pending
}
