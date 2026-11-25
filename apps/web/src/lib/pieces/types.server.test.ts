import { beforeEach, expect, test, vi } from 'vitest'
import { getConfiguredPieceTypes, isConfiguredPieceType } from './types.server.js'

const { config } = vi.hoisted(() => ({ config: { pieces: {} as Record<string, object> } }))
vi.mock('#lib/server/config.js', () => ({ config }))

beforeEach(() => {
	config.pieces = { 'arbitrary-kind': {}, ['__proto__']: {}, constructor: {} }
})

test('reads exact configured names, not a compiled catalog', () => {
	expect(new Set(getConfiguredPieceTypes())).toEqual(
		new Set(['arbitrary-kind', '__proto__', 'constructor'])
	)
	for (const type of getConfiguredPieceTypes()) expect(isConfiguredPieceType(type)).toBe(true)
	expect(isConfiguredPieceType('unknown')).toBe(false)
	expect(isConfiguredPieceType('ARBITRARY-KIND')).toBe(false)
})

test('does not recognize inherited keys', () => {
	config.pieces = {}
	expect(isConfiguredPieceType('__proto__')).toBe(false)
	expect(isConfiguredPieceType('constructor')).toBe(false)
})

test('returns a new public list without exposing mutable configuration records', () => {
	const types = getConfiguredPieceTypes()
	types.reverse()
	types.push('not-configured')
	expect(Object.keys(config.pieces)).toEqual(['arbitrary-kind', '__proto__', 'constructor'])
	expect(isConfiguredPieceType('not-configured')).toBe(false)
})

test('reflects the loaded server configuration rather than retaining a separate cached list', () => {
	config.pieces = { 'loaded-at-server-start': {} }
	expect(getConfiguredPieceTypes()).toEqual(['loaded-at-server-start'])
	expect(isConfiguredPieceType('arbitrary-kind')).toBe(false)
	config.pieces = {}
	expect(getConfiguredPieceTypes()).toEqual([])
	expect(isConfiguredPieceType('loaded-at-server-start')).toBe(false)
})
