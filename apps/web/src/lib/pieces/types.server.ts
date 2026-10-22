import { config } from '$lib/server/config'

export function getConfiguredPieceTypes(): string[] {
	return [...new Set(config.pieces.map((piece) => piece.type))]
}

export function isConfiguredPieceType(type: string): boolean {
	return config.pieces.some((piece) => piece.type === type)
}
