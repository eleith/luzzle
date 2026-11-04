import { expect, test } from 'vitest'
import { formatSource, SOURCE_SIZE_LIMIT } from './source'

test('formats structured JSON MIME types without changing nested values', () => {
	const content = ' {"items":[null,{"active":true}],"empty":{}} '

	expect(formatSource(content, ' Application/Problem+JSON; charset=utf-8 ')).toBe(`{
  "items": [
    null,
    {
      "active": true
    }
  ],
  "empty": {}
}`)
})

test('formatting preserves numeric lexemes and duplicate keys rather than serializing parsed data', () => {
	const values = [
		'9007199254740993',
		'-9007199254740993',
		'1.234567890123456789',
		'1e+400',
		'1E-400',
		'-0',
		'1.00'
	]
	const content = `{${values.map((value) => `"duplicate":${value}`).join(',')}}`

	expect(formatSource(content, 'application/json')).toBe(
		`{\n${values.map((value) => `  "duplicate": ${value}`).join(',\n')}\n}`
	)
})

test('formatting preserves escaped strings and whitespace inside values', () => {
	const content = String.raw`{"\u006b":"\u003cscript\u003e\r\n\t\/\\\"", "k":"a  b,:{}[]"}`
	const expected = String.raw`{
  "\u006b": "\u003cscript\u003e\r\n\t\/\\\"",
  "k": "a  b,:{}[]"
}`

	expect(formatSource(content, 'application/json')).toBe(expected)
})

test('invalid JSON remains exactly as recorded instead of being repaired or discarded', () => {
	const content = ' \r\n {"items":[1,]}\t '

	expect(formatSource(content, 'application/json')).toBe(content)
})

test.each(['text/plain', 'source.json'])(
	'JSON-looking content with MIME %s remains unformatted',
	(mime) => {
		const content = ' \r\n { "items": [1,2] }\t '

		expect(formatSource(content, mime)).toBe(content)
	}
)

test('oversized source remains complete without formatting', () => {
	const content = '{"value":1}'.padEnd(SOURCE_SIZE_LIMIT + 1, ' ') + '\r\n'

	expect(formatSource(content, 'application/json')).toBe(content)
})

test('pathological nesting falls back to the complete original source', () => {
	const content = '['.repeat(1000) + 'null' + ']'.repeat(1000)

	expect(formatSource(content, 'application/json')).toBe(content)
})

test('formatting that would exceed the output budget leaves the original intact', () => {
	const content = '[' + Array(30_000).fill('0').join(',') + ']'

	expect(content.length).toBeLessThan(SOURCE_SIZE_LIMIT)
	expect(formatSource(content, 'application/json')).toBe(content)
})
