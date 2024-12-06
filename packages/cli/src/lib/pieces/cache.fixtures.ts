import { LuzzleSelectable } from '@luzzle/core'

function makeCache(
	override: Partial<LuzzleSelectable<'pieces_cache'>> = {}
): LuzzleSelectable<'pieces_cache'> {
	return {
		id: '1',
		file_path: 'file',
		date_added: new Date().getTime(),
		date_updated: new Date().getTime(),
		content_hash: 'content',
		...override,
	}
}

export { makeCache }
