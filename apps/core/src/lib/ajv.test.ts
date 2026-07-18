import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach } from 'vitest'
import { makeSchema } from '../pieces/Piece.fixtures.js'
import Ajv from 'ajv'
import ajv, {
	assetFormatValidator,
	dateFormatValidator,
	commaSeparatedFormatValidator,
	paragraphFormatValidator,
	markdownFormatValidator
} from './ajv.js'

vi.mock('ajv')

const mocks = {
	Ajv: vi.mocked(Ajv),
	compile: vi.mocked(Ajv.prototype.compile),
	addFormat: vi.mocked(Ajv.prototype.addFormat),
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
		expect(mocks.compile).toHaveBeenCalledWith(schema)
	})

	test('commaSeparatedFormatValidator', () => {
		expect(commaSeparatedFormatValidator('a,b,c')).toBe(true)
	})

	test('dateFormatValidator', () => {
		expect(dateFormatValidator('2020-01-01')).toBe(true)
		expect(dateFormatValidator('2020-01-32')).toBe(false)
	})

	test('assetFormatValidtor', () => {
		expect(assetFormatValidator('.assets/1/2/3')).toBe(true)
		expect(assetFormatValidator('./home/to/nowhere/5.jpg')).toBe(false)
	})

	test('paragraphFormatValidtor', () => {
		expect(paragraphFormatValidator('hi there')).toBe(true)
	})

	test('paragraphFormatValidtor', () => {
		expect(paragraphFormatValidator('hi there')).toBe(true)
	})

	test('markdownFormatValidtor', () => {
		expect(markdownFormatValidator('hi there')).toBe(true)
	})
})
