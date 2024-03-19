import { LuzzleSelectable, Pieces } from '@luzzle/core'

function makeCache(
	override: Partial<LuzzleSelectable<'pieces_cache'>> = {}
): LuzzleSelectable<'pieces_cache'> {
	return {
		id: '1',
		slug: 'slug',
		type: 'table' as Pieces,
		date_added: new Date().getTime(),
		date_updated: new Date().getTime(),
		content_hash: 'content',
		...override,
	}
}

export { makeCache }
