import {
	Pieces,
	pieceFrontMatterFromPrompt,
	type PieceFrontmatter,
	type PieceFrontmatterSchema
} from '@luzzle/core'
import { getStorage } from './storage'
import { config } from './config'

let pieces: Pieces | null = null

export function getPieces(): Pieces {
	if (pieces) {
		return pieces
	}

	const storage = getStorage()
	pieces = new Pieces(storage)

	return pieces
}

export async function promptToPiece(
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	prompt: string,
	file?: Buffer[]
) {
	if (!config.ai) {
		throw new Error('AI is not configured. Please check your config.yaml')
	}

	return pieceFrontMatterFromPrompt(config.ai.api_key, schema, prompt, file)
}
