import { db } from '$lib/server/database'
import { MarkdownPublicationStatus } from './types.js'

export async function getMarkdownPublicationStatus(
	file: string,
	publishedHash?: string | null
): Promise<MarkdownPublicationStatus> {
	if (!publishedHash) return MarkdownPublicationStatus.UNKNOWN

	const cached = await db
		.selectFrom('pieces_cache')
		.select('content_hash')
		.where('file_path', '=', file)
		.executeTakeFirst()

	if (!cached?.content_hash) return MarkdownPublicationStatus.UNKNOWN
	return cached.content_hash === publishedHash
		? MarkdownPublicationStatus.MATCHING
		: MarkdownPublicationStatus.CHANGED
}
