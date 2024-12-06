import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { makeSchema } from '../pieces/utils/piece.fixtures.js'
import Ajv from 'ajv'
import ajv, {
	luzzleAssetFormatValidator,
	luzzleDateFormatValidator,
	luzzleCommaSeparatedFormatValidator,
} from './ajv.js'

vi.mock('ajv')

const mocks = {
	Ajv: vi.mocked(Ajv.default),
	compile: vi.mocked(Ajv.default.prototype.compile),
	addFormat: vi.mocked(Ajv.default.prototype.addFormat),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/lib/ajv.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('ajv', () => {
		const schema = makeSchema()

		ajv(schema)

		expect(mocks.Ajv).toHaveBeenCalledTimes(1)
		expect(mocks.addFormat).toHaveBeenCalledTimes(3)
		expect(mocks.compile).toHaveBeenCalledWith(schema)
	})

	test('luzzleCommaSeparatedFormatValidator', () => {
		expect(luzzleCommaSeparatedFormatValidator('a,b,c')).toBe(true)
	})

	test('luzzleDateFormatValidator', () => {
		expect(luzzleDateFormatValidator('2020-01-01')).toBe(true)
		expect(luzzleDateFormatValidator('2020-01-32')).toBe(false)
	})

	test('luzzleAssetFormatValidtor', () => {
		expect(luzzleAssetFormatValidator('.assets/1/2/3')).toBe(true)
		expect(luzzleAssetFormatValidator('./home/to/nowhere/5.jpg')).toBe(false)
	})
})
