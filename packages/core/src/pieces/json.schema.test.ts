import { describe, afterEach, test, vi, expect, MockInstance } from 'vitest'
import { getPieceSchemaFromFile } from './json.schema.js'
import { existsSync, readFileSync } from 'fs'

vi.mock('fs')

const spies: { [key: string]: MockInstance } = {}

const mocks = {
	existsSync: vi.mocked(existsSync),
	readFileSync: vi.mocked(readFileSync),
}

describe('pieces/jtd.schema.test.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('getPieceSchemaFromFile', () => {
		const file = 'file.json'
		const schemaJson = { type: 'object' }

		mocks.existsSync.mockReturnValue(true)
		mocks.readFileSync.mockReturnValue(JSON.stringify(schemaJson))

		const schema = getPieceSchemaFromFile(file)

		expect(schema).toEqual(schemaJson)
	})
})
