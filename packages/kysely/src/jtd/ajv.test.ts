import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import Ajv from 'ajv/dist/jtd.js'
import { FuncKeywordDefinition, SchemaValidateFunction } from 'ajv/dist/types/index.js'
import ajv, { formatKeyword } from './ajv.js'

vi.mock('ajv/dist/jtd.js')
vi.mock('@luzzle/kysely')

const mocks = {
	ajv: vi.mocked(Ajv),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/pieces/ajv', () => {
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
		ajv({})
		expect(mocks.ajv).toHaveBeenCalledTimes(1)
	})

	test('validate date-string', () => {
		const keyword = formatKeyword as FuncKeywordDefinition
		const validate = keyword.validate as SchemaValidateFunction

		const passTrue = validate('date-string', '2021-01-01')

		expect(passTrue).toBe(true)
		expect(validate.errors).toHaveLength(0)

		const passFalse = validate('date-string', 'oops')

		expect(passFalse).toBe(false)
		expect(validate.errors).toHaveLength(1)
	})

	test('validate invalid schema', () => {
		const keyword = formatKeyword as FuncKeywordDefinition
		const validate = keyword.validate as SchemaValidateFunction

		const passFalse = validate('email', 'oops')

		expect(passFalse).toBe(false)
	})
})
