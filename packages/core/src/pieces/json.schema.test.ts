import { describe, expect, test, afterEach, MockInstance } from 'vitest'
import { Piece, Pieces } from './tables.schema.js'
import { getPieceSchema } from './json.schema.js'

const spies: { [key: string]: MockInstance } = {}

describe('pieces/jtd.schema.test.ts', () => {
	afterEach(() => {
		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('getPieceSchema', async () => {
		const pieces = Object.values(Piece)

		for (const piece of pieces) {
			const plugin = getPieceSchema(piece)
			expect(plugin).toBeDefined()
		}
	})

	test('getPieceSchema throws', async () => {
		const get = () => getPieceSchema('fake' as Pieces)
		expect(get).toThrow()
	})
})
