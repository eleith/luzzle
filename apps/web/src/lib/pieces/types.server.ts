import { config } from '#lib/server/config.js'

export function getConfiguredPieceTypes(): string[] {
	return Object.keys(config.pieces)
}

export function isConfiguredPieceType(type: string): boolean {
	return Object.hasOwn(config.pieces, type)
}
