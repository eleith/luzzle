import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { Piece, Pieces } from '../tables/pieces.schema.js'
import { getPieceSchema } from './index.js'

vi.mock('../jtd/index.js')

// const mocks = {}
const spies: { [key: string]: MockInstance } = {}

describe('src/pieces/index.ts', () => {
	afterEach(() => {
		// Object.values(mocks).forEach((mock) => {
		// 	mock.mockReset()
		// })

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
