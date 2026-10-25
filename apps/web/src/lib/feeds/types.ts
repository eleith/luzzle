import type { PublicWebPiece } from '@luzzle/web.pieces'

export interface FeedReference {
	readonly url: string
	readonly type: 'piece' | 'tag'
	readonly label: string
}

export interface FeedData {
	readonly feed: FeedReference
	readonly pieces: readonly PublicWebPiece[]
}
