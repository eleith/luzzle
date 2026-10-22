import { beforeEach, expect, test, vi } from 'vitest'
import { getConfiguredPieceTypes, isConfiguredPieceType } from './types.server.js'

const { config } = vi.hoisted(() => ({ config: { pieces: [] as Array<{ type: string }> } }))
vi.mock('$lib/server/config', () => ({ config }))

beforeEach(() => {
	config.pieces = [{ type: 'arbitrary-kind' }, { type: '__proto__' }, { type: 'constructor' }]
})

test('reads exact configured names in configuration order, not a compiled catalog', () => {
	expect(getConfiguredPieceTypes()).toEqual(['arbitrary-kind', '__proto__', 'constructor'])
	for (const type of getConfiguredPieceTypes()) expect(isConfiguredPieceType(type)).toBe(true)
	expect(isConfiguredPieceType('unknown')).toBe(false)
	expect(isConfiguredPieceType('ARBITRARY-KIND')).toBe(false)
})

test('coalesces repeated configured names without changing their first-seen order', () => {
	config.pieces.push({ type: 'arbitrary-kind' }, { type: 'constructor' })
	expect(getConfiguredPieceTypes()).toEqual(['arbitrary-kind', '__proto__', 'constructor'])
})

test('returns a new public list without exposing mutable configuration records', () => {
	const types = getConfiguredPieceTypes()
	types.reverse()
	types.push('not-configured')
	expect(config.pieces.map((piece) => piece.type)).toEqual([
		'arbitrary-kind',
		'__proto__',
		'constructor'
	])
	expect(isConfiguredPieceType('not-configured')).toBe(false)
})

test('reflects the loaded server configuration rather than retaining a separate cached list', () => {
	config.pieces = [{ type: 'loaded-at-server-start' }]
	expect(getConfiguredPieceTypes()).toEqual(['loaded-at-server-start'])
	expect(isConfiguredPieceType('arbitrary-kind')).toBe(false)
	config.pieces = []
	expect(getConfiguredPieceTypes()).toEqual([])
	expect(isConfiguredPieceType('loaded-at-server-start')).toBe(false)
})
