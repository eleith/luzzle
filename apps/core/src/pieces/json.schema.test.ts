import { describe, afterEach, test, vi, expect, MockInstance } from 'vitest'
import { jsonToPieceSchema } from './json.schema.js'
import { existsSync, readFileSync } from 'fs'

vi.mock('fs')

const spies: { [key: string]: MockInstance } = {}

const mocks = {
	existsSync: vi.mocked(existsSync),
	readFileSync: vi.mocked(readFileSync),
}

describe('./pieces/json.schema.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('jsonToPieceSchema', () => {
		const jsonObj = { type: 'object' }
		const json = JSON.stringify(jsonObj)

		const schema = jsonToPieceSchema(json)

		expect(schema).toEqual(jsonObj)
	})
})
