import type { LuzzleSelectable, Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.utils'
import type { getDatabase } from '../database.js'

export type TransformInput = {
	item: LuzzleSelectable<'pieces_items'>
	config: Config
	outDir: string
	pieces: Pieces
	db: ReturnType<typeof getDatabase>
}
