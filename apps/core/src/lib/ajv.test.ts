import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach } from 'vitest'
import { makeSchema } from '../pieces/Piece.fixtures.js'
import Ajv from 'ajv'
import ajv, {
	assetFormatValidator,
	assetSourceFormatValidator,
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

	test.each([undefined, {}, { allowAssetUrls: false }])(
		'keeps the strict asset format by default: %j',
		(options) => {
			ajv(makeSchema(), options)
			expect(mocks.addFormat).toHaveBeenCalledWith('asset', {
				type: 'string', validate: assetFormatValidator,
			})
		}
	)

	test('draft compilation changes only the asset validator, not the schema or other formats', () => {
		const schema = makeSchema({ cover: { type: 'string', format: 'asset' } })
		const original = structuredClone(schema)
		ajv(schema, { allowAssetUrls: true })

		expect(mocks.addFormat.mock.calls).toEqual([
			['date', { type: 'string', validate: dateFormatValidator }],
			['asset', { type: 'string', validate: assetSourceFormatValidator }],
			['comma-separated', { type: 'string', validate: commaSeparatedFormatValidator }],
			['paragraph', { type: 'string', validate: paragraphFormatValidator }],
			['markdown', { type: 'string', validate: markdownFormatValidator }],
		])
		expect(mocks.compile).toHaveBeenCalledWith(schema)
		expect(schema).toEqual(original)
	})

	test.each([
		'.assets/books/cover.jpg',
		'https://example.com/cover.jpg?size=large#cover',
		'http://example.com/cover.jpg',
		'HTTPS://example.com/cover.jpg',
		'HtTp://example.com/cover.jpg',
	])('assetSourceFormatValidator accepts %s', (source) => {
		expect(assetSourceFormatValidator(source)).toBe(true)
		if (!source.startsWith('.assets/')) expect(assetFormatValidator(source)).toBe(false)
	})

	test.each([
		'', 'not an asset', './cover.jpg', '.assets/cover.jpg',
		'https://', 'http://[invalid', '//example.com/cover.jpg',
		'file:///tmp/cover.jpg', 'data:image/png;base64,YQ==', 'javascript:alert(1)',
		'ftp://example.com/cover.jpg', ' https://example.com/cover.jpg',
	])('assetSourceFormatValidator rejects %s', (source) => {
		expect(assetSourceFormatValidator(source)).toBe(false)
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
