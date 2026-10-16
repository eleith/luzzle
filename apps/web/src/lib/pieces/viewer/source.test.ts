import { expect, test } from 'vitest'
import { formatSource, SOURCE_SIZE_LIMIT, sourceLanguage } from './source'

test.each([
	['application/json', 'JSON'],
	[' TEXT/JSON ; charset=utf-8 ', 'JSON'],
	['application/ld+json', 'JSON'],
	['model/gltf+json', 'JSON'],
	['text/vendor+json', 'JSON'],
	['text/html', 'HTML'],
	[' Application/XHTML+XML; charset=UTF-8', 'HTML'],
	['text/css', 'CSS'],
	['text/javascript', 'JavaScript'],
	['application/javascript', 'JavaScript'],
	['text/ecmascript', 'JavaScript'],
	['application/ecmascript', 'JavaScript'],
	['text/xml', 'XML'],
	['application/xml', 'XML'],
	['application/atom+xml', 'XML'],
	['image/svg+xml', 'XML'],
	['text/custom+xml', 'XML'],
	['text/markdown', 'Markdown'],
	['application/yaml', 'YAML'],
	['application/x-yaml', 'YAML'],
	['text/yaml', 'YAML'],
	['text/x-yaml', 'YAML']
])('maps only normalized MIME %s to installed language %s', (mime, language) => {
	expect(sourceLanguage(mime)).toBe(language)
})

test.each([
	'',
	'text/plain',
	'application/octet-stream',
	'application/json5',
	'application/not-json',
	'image/json',
	'json',
	'index.html',
	'javascript',
	'__proto__',
	'constructor',
	'text/html/other',
	'application/bad type+json'
])('does not guess a language from %s', (mime) => {
	expect(sourceLanguage(mime)).toBeUndefined()
	expect(formatSource('  {"key":1}\r\n', mime)).toBe('  {"key":1}\r\n')
})

test('pretty prints only JSON, including nested nulls, arrays and empty containers', () => {
	expect(
		formatSource(' \r\n{"a":[null,{"b":true,"c":false},[],{}],"empty":{ }}\t', 'application/json')
	).toBe(`{
  "a": [
    null,
    {
      "b": true,
      "c": false
    },
    [],
    {}
  ],
  "empty": {}
}`)
})

test('preserves unsafe integer, decimal, exponent and negative-zero lexemes and duplicate keys', () => {
	const values = [
		'9007199254740993',
		'-9007199254740993',
		'1.234567890123456789',
		'1e+400',
		'1E-400',
		'-0',
		'1.00'
	]
	const input = `{${values.map((value) => `"duplicate":${value}`).join(',')}}`
	expect(formatSource(input, 'application/problem+json')).toBe(
		`{\n${values.map((value) => `  "duplicate": ${value}`).join(',\n')}\n}`
	)
})

test('retains escaped strings, whitespace inside strings and HTML as literal text', () => {
	const input = String.raw`{"\u006b":"\u003cscript\u003e\r\n\t\/\\\"", "k":"a  b,:{}[]", "html":"</script><img src=x onerror=alert(1)>"}`
	const expected = String.raw`{
  "\u006b": "\u003cscript\u003e\r\n\t\/\\\"",
  "k": "a  b,:{}[]",
  "html": "</script><img src=x onerror=alert(1)>"
}`
	expect(formatSource(input, 'application/json')).toBe(expected)
})

test.each(['null', 'true', 'false', '42', '-0', '1e400', '"a\\n b"', '[]', '{}'])(
	'formats the top-level JSON value %s without changing its lexeme',
	(value) => {
		expect(formatSource(` \r\n${value}\t `, 'text/json')).toBe(value)
	}
)

test.each([
	'',
	' \r\n\t',
	'{',
	'{"a":1,}',
	'[1,]',
	'{"a":undefined}',
	'{"a":NaN}',
	'{"a":01}',
	'{"a":"\\x01"}',
	'{"a":"unescaped\nline"}',
	'{"a":1} trailing',
	'null null',
	'/* comment */ {}',
	'{"a":1}\u00a0'
])('returns malformed JSON exactly as supplied: %j', (input) => {
	expect(formatSource(input, 'application/json')).toBe(input)
})

test.each([
	'text/html',
	'application/xhtml+xml',
	'text/css',
	'text/javascript',
	'application/xml',
	'text/markdown',
	'application/yaml',
	'text/plain'
])('never formats non-JSON %s, even if its contents look like JSON', (mime) => {
	const input = ' \r\n { "a": [1,2] }\r\n\t'
	expect(formatSource(input, mime)).toBe(input)
})

test('formats nested JSON iteratively, with a finite depth fallback', () => {
	const nested = '['.repeat(30) + 'null' + ']'.repeat(30)
	const formatted = formatSource(nested, 'application/json')
	expect(formatted).not.toBe(nested)
	expect(formatted.replace(/\s/g, '')).toBe(nested)
	const deep = '['.repeat(101) + 'null' + ']'.repeat(101)
	expect(formatSource(deep, 'application/json')).toBe(deep)
})

test('formats at the input budget, but keeps every original character above it', () => {
	const atLimit = '{}'.padEnd(SOURCE_SIZE_LIMIT, ' ')
	expect(formatSource(atLimit, 'application/json')).toBe('{}')
	const oversized = atLimit + '\r\n'
	expect(formatSource(oversized, 'application/json')).toBe(oversized)
})

test('returns the entire original when pretty output would exceed the budget', () => {
	const input = '[' + Array(20_000).fill('0').join(',') + ']'
	expect(input.length).toBeLessThan(SOURCE_SIZE_LIMIT)
	expect(formatSource(input, 'application/json')).toBe(input)
})
