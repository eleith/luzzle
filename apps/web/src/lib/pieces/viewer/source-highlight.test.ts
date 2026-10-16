import { afterEach, expect, test, vi } from 'vitest'
import { languages } from '@codemirror/language-data'
import { highlightSource } from './source-highlight'
import { formatSource, SOURCE_SIZE_LIMIT, type SourceToken } from './source'

afterEach(() => vi.restoreAllMocks())

function expectReconstruction(tokens: SourceToken[], content: string) {
	expect(tokens.map((token) => token.text).join('')).toBe(content)
	for (const token of tokens) {
		expect(token.classes).toMatch(/^(?:tok-[\w-]+(?: tok-[\w-]+)*)?$/)
		expect(Object.keys(token).sort()).toEqual(['classes', 'text'])
	}
}

function expectClass(tokens: SourceToken[], text: string, name: string) {
	expect(
		tokens.some((token) => token.text.includes(text) && token.classes.split(' ').includes(name)),
		`${text}: ${name}`
	).toBe(true)
}

test('highlights already formatted JSON with existing editor classes and exact reconstruction', async () => {
	const content = formatSource(
		'{"name":"value","count":9007199254740993,"ok":true,"none":null}',
		'application/json'
	)
	const tokens = await highlightSource(content, ' Application/LD+JSON; charset=UTF-8 ')
	expectReconstruction(tokens, content)
	expectClass(tokens, '"name"', 'tok-name')
	expectClass(tokens, '"value"', 'tok-string')
	expectClass(tokens, '9007199254740993', 'tok-number')
	expectClass(tokens, 'true', 'tok-bool')
	expectClass(tokens, 'null', 'tok-keyword')
	expectClass(tokens, '{', 'tok-punctuation')
})

test('highlights HTML tags, attributes, values and comments without rendering markup', async () => {
	const content = '<!-- comment -->\r\n<div class="hello">literal &lt;text&gt;</div>\r\n'
	const tokens = await highlightSource(content, 'text/html')
	expectReconstruction(tokens, content)
	expectClass(tokens, 'div', 'tok-name')
	expectClass(tokens, 'class', 'tok-name')
	expectClass(tokens, '"hello"', 'tok-string')
	expectClass(tokens, '<!-- comment -->', 'tok-comment')
})

test.each([
	['text/css', 'a { color: red; }\r\n'],
	['text/javascript', 'const count = 42;\r\n// comment\r\n'],
	['text/xml', '<?xml version="1.0"?>\r\n<root count="1" />\r\n'],
	['image/svg+xml', '<svg><path d="M0 0" /></svg>\r\n'],
	['text/markdown', '# Heading\r\n\r\n> quote\r\n\r\n`code` and **strong**\r\n'],
	['application/yaml', 'title: "value"\r\n# comment\r\n']
])('uses installed %s parser while preserving CRLF and all whitespace', async (mime, content) => {
	const tokens = await highlightSource(content, mime)
	expectReconstruction(tokens, content)
	expect(tokens.some((token) => token.classes)).toBe(true)
})

test('shares the editor extra Markdown classes without importing editor chrome', async () => {
	const content = '> quote\n\n`code`\n\n---\n'
	const tokens = await highlightSource(content, 'text/markdown')
	expectReconstruction(tokens, content)
	expectClass(tokens, 'quote', 'tok-quote')
	expectClass(tokens, 'code', 'tok-monospace')
	expectClass(tokens, '---', 'tok-contentSeparator')
})

test.each([
	[
		'text/html',
		'<img src=x onerror="alert(1)" class="tok-attacker user-css"><script>alert(2)</script>'
	],
	[
		'application/json',
		String.raw`{"</script>":"<img src=x onerror=alert(1)>","class":"tok-attacker user-css","escape":"\u003c"}`
	]
])(
	'keeps XSS-shaped %s payloads literal and never derives classes from content',
	async (mime, content) => {
		const tokens = await highlightSource(content, mime)
		expectReconstruction(tokens, content)
		expect(tokens.map((token) => token.classes).join(' ')).not.toMatch(
			/attacker|user-css|alert|onerror/
		)
	}
)

test.each(['', 'text/plain', 'application/octet-stream', 'unknown.html', 'constructor'])(
	'returns one complete plaintext token for unknown MIME %j',
	async (mime) => {
		const content = ' \r\n<div>{"key":1}</div>\t\r\n'
		expect(await highlightSource(content, mime)).toEqual([{ text: content, classes: '' }])
	}
)

test.each(['', ' \r\n\t', '{"incomplete":', '{"raw":1,"raw":2}'])(
	'reconstructs empty, whitespace, malformed and unformatted JSON exactly: %j',
	async (content) => {
		expectReconstruction(await highlightSource(content, 'application/json'), content)
	}
)

test('returns all original plaintext above the highlighting budget without loading a parser', async () => {
	const description = languages.find((language) => language.name === 'JSON')!
	const load = vi.spyOn(description, 'load')
	const content = '{"key":1}'.padEnd(SOURCE_SIZE_LIMIT + 1, ' ') + '\r\n'
	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
	expect(load).not.toHaveBeenCalled()
})

test('can highlight exactly at the input size budget', async () => {
	const content = '{"key":1}'.padEnd(SOURCE_SIZE_LIMIT, ' ')
	const tokens = await highlightSource(content, 'application/json')
	expectReconstruction(tokens, content)
	expectClass(tokens, '"key"', 'tok-name')
})

test('falls back to complete plaintext when a known language is unavailable', async () => {
	vi.spyOn(languages, 'find').mockReturnValueOnce(undefined)
	const content = '{"key":1}\r\n'
	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
})

test('falls back to complete plaintext when language loading rejects', async () => {
	const description = languages.find((language) => language.name === 'JSON')!
	vi.spyOn(description, 'load').mockRejectedValueOnce(new Error('language unavailable'))
	const content = '{"key":1}\r\n'
	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
})

test('falls back to complete plaintext when parsing fails', async () => {
	const support = await languages.find((language) => language.name === 'JSON')!.load()
	vi.spyOn(support.language.parser, 'parse').mockImplementationOnce(() => {
		throw new Error('parse failed')
	})
	const content = '{"key":1}\r\n'
	expect(await highlightSource(content, 'application/json')).toEqual([
		{ text: content, classes: '' }
	])
})
